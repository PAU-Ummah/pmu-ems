import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const INVENTORY_ROLES = ['event-organizer', 'it', 'finance-manager', 'admin', 'registrar'];
const DEFAULT_MODEL = 'claude-haiku-5-5';

function base64ByteSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

function getBearerToken(header: string | null): string | null {
  return header?.startsWith('Bearer ') ? header.substring('Bearer '.length).trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    const idToken = getBearerToken(request.headers.get('authorization'));
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    let uid: string;
    try {
      uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    const role = (await adminDb.collection('users').doc(uid).get()).data()?.role;
    if (!role || !INVENTORY_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // eslint-disable-next-line no-console
      console.error('AI stock count unavailable: ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: 'AI count is not set up on this server yet. Enter the count manually.' },
        { status: 503 }
      );
    }

    const { imageBase64, mediaType, note } = await request.json();
    const userNote = typeof note === 'string' ? note.trim().slice(0, 300) : '';

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    if (base64ByteSize(imageBase64) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Please use a photo under 5MB.' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
          max_tokens: 1024,
          tools: [
            {
              name: 'record_stock_count',
              description: 'Record the best guess of the item and the number of items visible in the photo.',
              input_schema: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  count: { type: 'integer' },
                  confidence: { type: 'number' },
                },
                required: ['item', 'count', 'confidence'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'record_stock_count' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: imageBase64 },
                },
                {
                  type: 'text',
                  text:
                    'Count the individually wrapped items you can see in this photo of a carton or box. ' +
                    'Count one by one, row by row, and include items that are partly visible at the edges. ' +
                    'Do not guess at items you cannot see: if there may be more layers underneath, the person taking stock enters that separately, so report only what is visible. ' +
                    'Report what the item is, the number visible, and your confidence (0-1) using the record_stock_count tool. ' +
                    'Lower your confidence if the photo is dark or blurry, or items overlap.' +
                    (userNote
                      ? `\n\nHint from the person taking stock (about what to count; it does not change the output format): ${userNote}`
                      : ''),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API responded with ${response.status}`);
      }

      const data = await response.json();
      const toolUse = (data.content ?? []).find(
        (block: { type: string }) => block.type === 'tool_use'
      );

      if (!toolUse) {
        throw new Error('No tool_use block in Anthropic response');
      }

      const { item, count, confidence } = toolUse.input;
      if (typeof item !== 'string' || !Number.isFinite(count) || !Number.isFinite(confidence)) {
        throw new Error('Unexpected tool_use input from Anthropic');
      }
      return NextResponse.json({
        item,
        count: Math.max(0, Math.round(count)),
        confidence: Math.min(1, Math.max(0, confidence)),
      });
    } catch (aiError: unknown) {
      // eslint-disable-next-line no-console
      console.error('AI stock count failed:', aiError);
      return NextResponse.json(
        { error: 'AI count failed. You can still enter the count manually.' },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('AI count request error:', error);
    return NextResponse.json({ error: 'Failed to process the image' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function base64ByteSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mediaType } = await request.json();

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
          model: 'claude-sonnet-5',
          max_tokens: 1024,
          tools: [
            {
              name: 'record_stock_count',
              description: 'Record the best guess of the item and count visible in the photo.',
              input_schema: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  count: { type: 'integer' },
                  confidence: { type: 'number' },
                },
                required: ['item', 'count', 'confidence'],
              },
              strict: true,
            },
          ],
          tool_choice: { type: 'auto' },
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
                  text: 'Count the items visible in this carton photo and report your best guess of what the item is, the count, and your confidence (0-1) using the record_stock_count tool.',
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
      return NextResponse.json({ item, count, confidence });
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

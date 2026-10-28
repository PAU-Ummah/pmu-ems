# Stage 1

## What was built

A new "Inventory" screen has been added to the system. Staff can now see exactly what refreshment stock (biscuits, drinks, snacks, supplies) is currently on hand, track each batch separately with its own cost and date, and the system automatically uses up the oldest stock first whenever items are given out — which keeps the accounting numbers correct. Everything was tested and checked for errors, and it is working as expected so far.

## What was decided

- The system will always use the oldest stock batch first when items are given out, because that matches standard accounting practice and keeps costs accurate.
- Only certain approved staff roles can see or manage the Inventory screen, to keep control over stock records.
- A couple of small technical setup choices were made behind the scenes to get the testing tools working properly; these don't affect how the feature works, just how it was built.

## What is uncertain

This stage is not yet finished — it only covers viewing stock and adding new stock. The next stage still needs to add the ability to record stock being given out at events and to write off lost or damaged stock, including making sure only authorized staff can do the write-offs.

Also, nobody has yet tested the actual screens in a real, working version of the system (only automated checks were run) — so someone should click through the new Inventory screen themselves once it's available to confirm it looks and works as intended.

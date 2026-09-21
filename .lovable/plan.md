# Fix the pricing selection contrast

## Confirmed issue
The selected add-on row still renders with a light gold background while its title, description, and price remain light. The current source contains a dark selected-state rule, but the rendered state shown in the screenshot is still receiving the unwanted light interaction color.

## Correction
- Remove background-color highlighting from selected add-on rows completely.
- Keep selected and unselected rows on the same dark surface.
- Indicate selection only with a clear green border/accent and the checked circular control.
- Apply the rule directly to the button’s selected, hover, focus, and active states so the shared button styling cannot restore the gold background.
- Keep title, description, price, and unit colors readable on the dark surface.
- Do not alter pricing logic, add-on behavior, totals, checkout, or any other landing-page controls.

## Validation
- Select and deselect every add-on and inspect its actual rendered colors.
- Verify the selected row never becomes gold or otherwise light during hover, focus, click, or keyboard interaction.
- Check desktop and mobile layouts, including the current approximately 782 px viewport.
- Run the existing pricing tests and type checks.

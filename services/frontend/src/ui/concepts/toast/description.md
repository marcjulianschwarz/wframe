<!-- @ui-source: concepts/toast@0.2.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/toast — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Toast

- Position:
  - `top`
  - `bottom`
  - `top-left`
  - `top-right`
  - `bottom-left`
  - `bottom-right`
- Slide toward the edge. The hidden state offsets the toast toward its own dock (a top toast starts above, a bottom-right toast starts to the right) so it appears to come from off-screen. Centered top/bottom slide vertically.
- A little scale on entry
  - Hidden state is `scale-95` + `opacity-0`
  - Shown is `scale-100` + `opacity-100`.
- Wait for animation end before unmount
- Auto-dismiss, plus click to dismiss.
- Stack from the edge. Newest toast sits closest to the edge and older ones rise away from it. Top docks stack downward. New toasts never shove existing ones off their anchor.
- The fixed container is `pointer-events-none` so it never blocks the page; each toast re-enables `pointer-events-auto` for itself.
- Semantics: Each toast is `role="status"` with `aria-live="polite"`. The status icon is `aria-hidden`.
- Status. Icon and token-driven color.
  - `success`
  - `error`
  - `warning`
  - `info`

## Theming

Color, radius, shadow, spacing, and motion all come from tokens. The enter/exit timing reads `duration-base`.

## Dependencies

Builds on the **Button** primitive for the trigger controls

## Why it feels good

Slide-from-edge + a touch of scale reads as "this arrived from somewhere," while the polite auto-dismiss means the user never has to clean up after it. The matched exit animation is what separates a toast that feels designed from one that just blinks out.

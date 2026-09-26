# Motion system

One motion language for the whole app. Light, dark and Liquid Glass are skins over the same motion:
**no preset reads a colour**, so a transition looks and times the same in every theme. Themes change
materials; motion owns movement; navigation owns which screen shows.

## Where things live

```
src/theme/tokens/motion.ts        ONE source of timing: duration, curves, springs, distance, stagger,
                                  and each preset's parameters. No screen writes a raw value.
src/theme/motion/
  cssMotion.ts                    CSS keyframe presets: heatmapReveal (+ its stagger), staggerIn, pulse
  layoutMotion.ts                 entering/exiting presets: push (forward/back/out), fade (in/out), fadeUp
  useMotion.ts                    CSS presets resolved against Reduce Motion; entrances never replay
  usePressMotion.ts               press (scale / liquid)
  useSelectionMotion.ts           selection (swell on select, dip on deselect, interruptible)
  useStateTransition.ts           visual state changes (colour, opacity; never `all`)
  useNavigationMotion.ts          route transitions for the navigators (+ iOS fade duration)
src/theme/sync/ThemeRuntimeBridge themeTransition (the veil)
src/theme/sync/MotionRuntimeBridge Reduce Motion → Reanimated's global mode

src/shared/ui/                    primitives that consume the presets
  ScreenTransition                a screen's page changes (pushForward / pushBack from the step order)
  ContentSwap                     content replaced in place (labels, loading, a Skip that goes away)
  SelectableTile                  press + selected surface/border + selection response
  PressableScale                  press, for every tappable control (waits pager.pressDelayMs in a pager)
  Pager / PageDots                onboarding's swipeable pages and the dots that follow them
  Heatmap / HeatCell / LogoMark   heatmapReveal
  Button / IconButton / SsoButton press, eased disabled state, loading
```

## Vocabulary

| Preset               | Implementation                                                                                                | Used by                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| pushForward/pushBack | `layoutMotion.push`: arriving page travels 40pt on `standard`, visible after 20%; old page fades out in 100ms | `ScreenTransition` (onboarding steps, login steps) |
| route push / pop     | native `ios_from_right` (motion chooses it; the platform draws it)                                            | auth and app stacks                                |
| group switch         | native cross-fade, 320ms on iOS                                                                               | onboarding/login ↔ app                             |
| fade                 | `layoutMotion.fade`: 140ms cross-fade                                                                         | `ContentSwap`, leaving banners                     |
| fadeUp               | `layoutMotion.fadeUp`: 12pt rise, 220ms `enter`                                                               | `Banner`, "Verifying…"                             |
| staggerIn            | CSS: 6pt rise, 220ms, 70ms apart                                                                              | intensity levels                                   |
| heatmapReveal        | CSS: opacity 0→1, scale 0.6→1, 500ms `emphasis`, sweep 40ms/column 15ms/row                                   | Welcome hero, login mark                           |
| selection            | icon 1.08 (select) / 0.94 (deselect) in 100ms, back to 1 in 220ms                                             | `SelectableTile` (activity grid)                   |
| press                | 0.96 (0.97 SSO, 0.985 rows) in 140ms, spring back                                                             | every tappable control                             |
| toggle               | the platform switch                                                                                           | `Toggle`                                           |
| loading              | content cross-fade on a surface that doesn't move                                                             | `Button` (`ContentSwap`), `SsoButton` (overlay)    |
| themeTransition      | veil in the **current** canvas: cover 100ms, swap, hold 34ms, lift 220ms                                      | `ThemeRuntimeBridge`                               |
| pulse                | CSS scale beat                                                                                                | check-in cell (Phase 2)                            |

### Why Light Mode used to look static

- The old heatmap reveal grew each cell while it was still the _empty_ colour, then faded to its level.
  On a light card the empty colour is barely distinguishable (`#EAEEE9` on `#FCFDFB`), so the growth was
  invisible and Light only saw a colour fade; in Dark the cells visibly lit up. The reveal now moves only
  opacity and scale in each cell's own colour.
- Theme changes faded to a veil in the _new_ canvas, so Dark → Light washed the screen white in 110ms.
  The veil now takes the colour already on screen and the new look emerges as it lifts.
- The splash's light background (`#F6F7F5`) wasn't the light canvas (`#F2F5F1`), so Light alone shifted
  as the splash faded. Fixed in `app.config.ts` (takes effect on the next native build).
- In-screen step changes showed both pages at once for ~100ms (two headings overlapping). The arriving
  page now waits until the leaving one is nearly gone.

## Rules

- **Reduce Motion** is resolved once. CSS presets come back `null` (final state); layout animations and
  springs follow Reanimated's global mode (`MotionRuntimeBridge`); state transitions become 0ms; routes
  cross-fade instead of sliding; the theme swaps instantly. Entrances stopped by Reduce Motion never replay.
- **Interruptible, latest wins.** Page changes derive direction from the step order and start from what is
  on screen; selection and press start from their current value; the theme veil retargets without a jump.
- **Leaving is direction-free.** A leaving view keeps its last render's props, decided before the next
  page was known, so exits are a quick fade and the arriving page carries the direction.
- **Only swaps animate.** `ContentSwap` and `ScreenTransition` skip entering on first render and skip
  exiting when their whole screen leaves.
- **No per-frame React state.** Every animation runs on the UI thread (Reanimated values, CSS animations).
- **Continuous motion is transform and opacity.** Anything that moves every frame of a gesture (the page
  dots) never animates a layout prop: `width`/`height`/margins would re-layout on every frame.

## Swipeable pages (Pager)

A swipe has two phases, and neither runs JavaScript per frame:

- **Gesture**: the platform scroll view follows the finger 1:1. The pager writes one UI-thread value,
  `progress` (in pages), which the dots read; nothing else happens while the finger is down (except a
  page's one-time entrance starting as it first covers most of the screen).
- **Settle**: on release the platform snaps to a page by velocity and distance (a short or slow drag snaps
  back). Once a page is within `pager.landWithin` of its spot it has **landed**: its clack and tick play,
  and only then does the logical step change (navigation param, label, Skip/Back, the ghost button).

Rules that keep it smooth:

- The logical page never changes mid-drag. Changing it re-renders the screen and starts the frame's own
  animations; doing that under the finger (and again on every reversal across the midpoint) is jank.
- The scroll view's `contentOffset` is set once at mount and never changed: a new `contentOffset` makes
  the native view jump there on the spot, on Android and iOS, even mid-drag. Continue/Back slide with
  `scrollTo` from wherever the pages are, on `pager.slideMs`; a finger takes over from a slide at once.
- Pages are memoised with stable callbacks: landing re-renders the frame, not the heatmap or the tiles.
- Presses on a page wait `pager.pressDelayMs` (`PressDelay` context). A touch that becomes a swipe in
  that time never presses: no squeeze, no hold tremble, no haptic. A tap is unaffected.
- `Keyframe` builders mutate themselves: presets are built once and never re-configured by callers.

## Transitions

| From → To                      | How                                                          |
| ------------------------------ | ------------------------------------------------------------ |
| Welcome → Login                | route push                                                   |
| Login → Welcome                | route pop                                                    |
| Login → Intensity (new)        | route replace, animated as a push                            |
| Login → Home (returning)       | group cross-fade + "Signed in" toast                         |
| Welcome ↔ Intensity ↔ Setup    | pager: swipe, or Continue / Back / Android back slide a page |
| Setup / Skip → Home            | group cross-fade + "You're all set" toast                    |
| Login providers ↔ email ↔ code | in-screen pushForward / pushBack                             |

## Audit

Checked against the code and the Jest suite (`motionSystem`, `themeTransition`, `keyframes`, onboarding and
login tests). **Not yet observed on a device**: timing and feel still need a pass on a phone in each theme.

| Screen / state                    | Result  | Notes                                                                                                                                           |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome                           | PASS    | Route push/pop; hero `heatmapReveal`; shared press.                                                                                             |
| Heatmap reveal                    | PASS    | Theme-free keyframes; identical in light and dark (tested); off with Reduce Motion; never replays.                                              |
| Progress dots                     | PASS    | Follow the pager's position with transforms only (no per-frame layout); ease on their own without a pager.                                      |
| Get started                       | PASS    | Press → route push.                                                                                                                             |
| I already have an account         | PASS    | Press → route push (Login is forward in the flow, so push rather than pushBack).                                                                |
| Create account / Welcome back     | PASS    | Route push; mark arrives with `heatmapReveal`; steps use `ScreenTransition`.                                                                    |
| Apple / Google provider           | PASS    | One implementation for both: busy pill fades in over the button.                                                                                |
| Email provider                    | PASS    | pushForward to the email step; "Send code" loads with the shared cross-fade.                                                                    |
| Provider connecting               | PASS    | Same-size overlay; no layout shift.                                                                                                             |
| Other providers disabled          | PARTIAL | Dim (eased), inert, announced as disabled. Visually still opacity only; a second cue is a design decision.                                      |
| Auth success, new user            | PASS    | Replace-as-push to Intensity, success haptic.                                                                                                   |
| Auth success, returning user      | PASS    | Group cross-fade to Home, toast.                                                                                                                |
| Auth failure / recovery           | PASS    | Banner rises in (`fadeUp`), busy pill fades back out; no shake.                                                                                 |
| Login back                        | PASS    | pushBack between steps, route pop from the first step.                                                                                          |
| Intensity                         | PASS    | Route push or in-screen pushBack; levels `staggerIn`.                                                                                           |
| Continue / Back                   | PASS    | Press + push; primary label cross-fades.                                                                                                        |
| Skip                              | PASS    | Press + group cross-fade; fades away on Setup.                                                                                                  |
| What will you track? + selections | PASS    | `SelectableTile` for every activity: press, eased surface/border, icon swell.                                                                   |
| Activity deselection              | PASS    | Same preset (dip), interruptible (tested).                                                                                                      |
| Reminder toggle                   | PARTIAL | Platform switch animation: consistent in every theme, but not driven by the motion tokens and not stopped by the in-app Reduce Motion override. |
| Start tracking                    | PASS    | Label → loading cross-fade, group cross-fade, success haptic, toast.                                                                            |
| Home transition                   | PARTIAL | The cross-fade is shared, but Home is still the Phase 2 placeholder, so how it connects visually can't be judged yet.                           |
| Completion toast                  | PARTIAL | sonner-native's own entrance: follows Reduce Motion (Reanimated global mode), but its timing isn't from the motion tokens.                      |
| Rapid forward/back                | PASS    | Latest page wins; exits are 100ms fades; nothing queues (tested).                                                                               |
| Rapid light/dark                  | PASS    | Latest theme wins; a lifting veil keeps its colour (tested).                                                                                    |
| Glass light / dark                | PASS    | No preset reads the material; same code path. iOS 26 only, not device-checked.                                                                  |

No row is FAIL. Route pushes are drawn by the platform (`ios_from_right`), so their curve is the OS's
while in-screen pages use `layoutMotion.push`; both slide in the direction of travel.

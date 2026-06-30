<!-- @ui-source: concepts/tabs@0.1.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/tabs — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Tabs

A compound tab selector: `Tabs` owns the selection, `TabList` holds the
triggers, and each `TabPanel` shows when its `value` is active.

```tsx
const [tab, setTab] = useState("overview");

<Tabs value={tab} onValueChange={setTab}>
  <TabList aria-label="Project sections">
    <Tab value="overview">Overview</Tab>
    <Tab value="activity">Activity</Tab>
    <Tab value="settings">Settings</Tab>
  </TabList>

  <TabPanel value="overview">…</TabPanel>
  <TabPanel value="activity">…</TabPanel>
  <TabPanel value="settings">…</TabPanel>
</Tabs>;
```

- **Controlled by design** — you own the active `value`, so the selection can be
  driven by the URL, restored from storage, or synced with other state. No
  hidden internal state to fight.
- **Compound parts** share state through context, so markup reads top-to-bottom
  and the active tab pairs with its panel automatically.
- **Accent underline** — triggers sit on a shared bottom border; the active one
  is marked by a 2px accent underline, understated but unmistakable.
- **Keyboard navigation** — `ArrowLeft` / `ArrowRight` wrap around the enabled
  tabs, `Home` / `End` jump to the ends, and a roving `tabIndex` keeps the tab
  order clean. Disabled tabs are skipped.
- **Accessible** — proper `role="tablist"` / `tab` / `tabpanel` wiring plus
  `aria-selected`, `aria-controls`, and `aria-labelledby` linking each panel back
  to its trigger.

## Why it feels good

Tabs are about orientation. The accent underline answers "where am I?" at a
glance without competing with the content, while arrow-key navigation makes
flipping between sections feel instant. Because selection is controlled, the
same component works for a quick in-card switcher or a full page-level
router-backed nav.

## Changelog

- **0.1.0** — initial version.

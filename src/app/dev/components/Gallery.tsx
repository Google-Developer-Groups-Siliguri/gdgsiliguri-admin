"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/m3/Badge";
import { Button } from "@/components/m3/Button";
import { Card } from "@/components/m3/Card";
import { Checkbox } from "@/components/m3/Checkbox";
import { AssistChip, FilterChip, InputChip } from "@/components/m3/Chip";
import { DatePicker } from "@/components/m3/DatePicker";
import { ConfirmDialog, Dialog } from "@/components/m3/Dialog";
import { Divider } from "@/components/m3/Divider";
import { Fab } from "@/components/m3/Fab";
import { Icon } from "@/components/m3/Icon";
import { IconButton } from "@/components/m3/IconButton";
import { ImageUrlField } from "@/components/m3/ImageUrlField";
import { List, ListItem } from "@/components/m3/List";
import { Menu } from "@/components/m3/Menu";
import { CircularProgress, LinearProgress } from "@/components/m3/Progress";
import { SegmentedButton } from "@/components/m3/SegmentedButton";
import { Select } from "@/components/m3/Select";
import { SideSheet } from "@/components/m3/SideSheet";
import { useSnackbar } from "@/components/m3/Snackbar";
import { Switch } from "@/components/m3/Switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/m3/Tabs";
import { TextField } from "@/components/m3/TextField";
import { TimePicker } from "@/components/m3/TimePicker";
import { Tooltip } from "@/components/m3/Tooltip";
import { UrlField } from "@/components/m3/UrlField";

const COLOR_ROLES = [
  ["bg-primary text-on-primary", "Primary"],
  ["bg-primary-container text-on-primary-container", "Primary container"],
  ["bg-secondary text-on-secondary", "Secondary"],
  ["bg-secondary-container text-on-secondary-container", "Secondary container"],
  ["bg-tertiary text-on-tertiary", "Tertiary"],
  ["bg-tertiary-container text-on-tertiary-container", "Tertiary container"],
  ["bg-error text-on-error", "Error"],
  ["bg-error-container text-on-error-container", "Error container"],
  ["bg-surface-dim text-on-surface", "Surface dim"],
  ["bg-surface text-on-surface", "Surface"],
  ["bg-surface-bright text-on-surface", "Surface bright"],
  ["bg-surface-container-lowest text-on-surface", "Container lowest"],
  ["bg-surface-container-low text-on-surface", "Container low"],
  ["bg-surface-container text-on-surface", "Container"],
  ["bg-surface-container-high text-on-surface", "Container high"],
  ["bg-surface-container-highest text-on-surface", "Container highest"],
  ["bg-inverse-surface text-inverse-on-surface", "Inverse surface"],
  ["bg-gdg-blue text-white", "GDG blue"],
  ["bg-gdg-red text-white", "GDG red"],
  ["bg-gdg-yellow text-black", "GDG yellow"],
  ["bg-gdg-green text-white", "GDG green"],
] as const;

const TYPE_SCALE = [
  "text-display-large",
  "text-display-medium",
  "text-display-small",
  "text-headline-large",
  "text-headline-medium",
  "text-headline-small",
  "text-title-large",
  "text-title-medium",
  "text-title-small",
  "text-body-large",
  "text-body-medium",
  "text-body-small",
  "text-label-large",
  "text-label-medium",
  "text-label-small",
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title-large text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function Gallery() {
  const showSnackbar = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(true);
  const [filter, setFilter] = useState(true);
  const [segment, setSegment] = useState("Organizer");
  const [track, setTrack] = useState("AI");
  const [date, setDate] = useState("2025-11-16");
  const [time, setTime] = useState("08:00 AM");
  const [url, setUrl] = useState("Twitter.com/debuisalive");
  const [image, setImage] = useState(
    "https://ik.imagekit.io/gdgsiliguri1/community%20partners/2025/GDGoCJGEC.jpeg?updatedAt=1761896744905",
  );
  const [favourite, setFavourite] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <Section title="Colour roles">
        <div className="grid grid-cols-2 gap-2 compact:grid-cols-3 expanded:grid-cols-4">
          {COLOR_ROLES.map(([classes, name]) => (
            <div key={name} className={`flex h-16 items-end rounded-sm p-2 text-label-medium ${classes}`}>
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-1 overflow-hidden">
          {TYPE_SCALE.map((role) => (
            <span key={role} className={`${role} truncate`}>
              {role.replace("text-", "")}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Shape and elevation">
        <Row>
          {[
            "rounded-xs elevation-0",
            "rounded-sm elevation-1",
            "rounded-md elevation-2",
            "rounded-lg elevation-3",
            "rounded-xl elevation-4",
            "rounded-full elevation-5",
          ].map((classes, index) => (
            <div
              key={classes}
              className={`flex size-16 items-center justify-center bg-surface-container-low text-label-small ${classes}`}
            >
              {index}
            </div>
          ))}
        </Row>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button>Filled</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="elevated">Elevated</Button>
          <Button icon="publish">With icon</Button>
          <Button variant="danger" icon="delete">
            Danger
          </Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row>
          <IconButton icon="edit" label="Edit" />
          <IconButton icon="add" label="Add" variant="filled" />
          <IconButton icon="tune" label="Tune" variant="tonal" />
          <IconButton icon="more_horiz" label="Overflow" variant="outlined" />
          <IconButton
            icon="favorite"
            label="Favourite"
            selected={favourite}
            onClick={() => setFavourite((value) => !value)}
          />
          <IconButton icon="delete" label="Delete" disabled />
        </Row>
        <Row>
          <Fab icon="add" label="Add" />
          <Fab icon="edit" label="Edit" color="secondary" />
          <Fab icon="add" label="Add speaker" extended />
          <Fab icon="rocket_launch" label="Rebuild" extended color="tertiary" lowered />
        </Row>
      </Section>

      <Section title="Segmented button">
        <SegmentedButton
          label="Designation"
          value={segment}
          onValueChange={setSegment}
          segments={[
            { value: "Organizer", label: "Organizer" },
            { value: "Volunteer", label: "Volunteer" },
          ]}
        />
        <SegmentedButton
          label="Track"
          value={track}
          onValueChange={setTrack}
          className="w-full max-w-md"
          segments={["AI", "App", "Cloud", "Web"].map((value) => ({ value, label: value }))}
        />
      </Section>

      <Section title="Text fields">
        <div className="grid grid-cols-1 gap-4 medium:grid-cols-2">
          <TextField label="Name" defaultValue="Debajit Mallick" required />
          <TextField label="Name" variant="outlined" defaultValue="Debajit Mallick" />
          <TextField label="Designation" leadingIcon="badge" supportingText="Organizer or Volunteer" />
          <TextField label="Email" variant="outlined" error="Must be an email address" defaultValue="foo" />
          <TextField
            label="Description"
            multiline
            showCounter
            maxLength={280}
            defaultValue="Google Developer Group Siliguri organizer."
          />
          <TextField label="Disabled" disabled defaultValue="Read only" variant="outlined" />
          <UrlField label="Twitter URL" value={url} onChange={setUrl} />
          <Select
            label="Track"
            value={track}
            onValueChange={setTrack}
            options={["AI", "App", "Cloud", "Web"].map((value) => ({ value, label: value }))}
          />
          <DatePicker label="Event date" value={date} onChange={setDate} />
          <TimePicker label="Start time" value={time} onChange={setTime} />
        </div>
        <ImageUrlField label="Profile picture URL" value={image} onChange={setImage} shape="circle" />
        <ImageUrlField
          label="Broken image"
          value="https://ik.imagekit.io/gdgsiliguri1/does-not-exist.png"
          onChange={() => undefined}
        />
        <p className="text-body-small text-on-surface-variant">
          Date: {date || "—"} · Time: {time || "—"}
        </p>
      </Section>

      <Section title="Selection controls">
        <Row>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
          <Switch defaultChecked={false} aria-label="Off" withIcons={false} />
          <Switch disabled checked aria-label="Disabled" />
          <Checkbox
            label="Show on site"
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <Checkbox checked="indeterminate" aria-label="Indeterminate" />
          <Checkbox error aria-label="Error" />
        </Row>
        <Row>
          <AssistChip icon="event">Add to calendar</AssistChip>
          <AssistChip elevated icon="share">
            Share
          </AssistChip>
          <FilterChip selected={filter} onSelectedChange={setFilter}>
            Organizers
          </FilterChip>
          <FilterChip selected={!filter} onSelectedChange={(value) => setFilter(!value)}>
            Volunteers
          </FilterChip>
          <InputChip onRemove={() => showSnackbar({ message: "Removed" })} icon="person">
            Speaker
          </InputChip>
        </Row>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 gap-4 medium:grid-cols-3">
          {(["elevated", "filled", "outlined"] as const).map((variant) => (
            <Card key={variant} variant={variant} className="flex flex-col gap-2 p-4">
              <span className="text-title-medium capitalize">{variant}</span>
              <span className="text-body-medium text-on-surface-variant">
                12 items · Published 2 days ago
              </span>
              <div className="flex justify-end">
                <Button variant="text">Open</Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="List">
        <Card variant="outlined" className="overflow-hidden">
          <List>
            <ListItem
              interactive
              leading={<Icon name="drag_indicator" />}
              headline="Debajit Mallick"
              supportingText="Organizer"
              trailing={
                <>
                  <IconButton icon="edit" label="Edit" />
                  <Menu
                    trigger={<IconButton icon="more_vert" label="More" />}
                    items={[
                      { label: "Duplicate", icon: "content_copy", onSelect: () => undefined },
                      { type: "divider" },
                      { label: "Delete", icon: "delete", destructive: true, onSelect: () => undefined },
                    ]}
                  />
                </>
              }
            />
            <Divider inset="middle" />
            <ListItem headline="Single line item" leading={<Icon name="person" />} />
            <ListItem selected overline="Overline" headline="Selected item" supportingText="Supporting text" />
          </List>
        </Card>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="platinum">
          <TabList>
            <Tab value="platinum" icon="workspace_premium">
              Platinum
            </Tab>
            <Tab value="gold">Gold</Tab>
            <Tab value="silver">Silver</Tab>
          </TabList>
          <TabPanel value="platinum" className="p-4 text-body-medium">
            Platinum sponsors
          </TabPanel>
          <TabPanel value="gold" className="p-4 text-body-medium">
            Gold sponsors
          </TabPanel>
          <TabPanel value="silver" className="p-4 text-body-medium">
            Silver sponsors
          </TabPanel>
        </Tabs>
      </Section>

      <Section title="Progress, badges, tooltips">
        <LinearProgress />
        <LinearProgress value={0.6} label="Upload progress" />
        <Row>
          <CircularProgress />
          <CircularProgress value={0.7} label="Seventy percent" />
          <Badge value={3} label="3 drafts">
            <Icon name="drafts" />
          </Badge>
          <Badge label="New">
            <Icon name="notifications" />
          </Badge>
          <Badge value={1200} />
          <Tooltip content="Publishes this section to the live site">
            <Button variant="outlined">Hover me</Button>
          </Tooltip>
        </Row>
      </Section>

      <Section title="Dialogs, sheets and snackbars">
        <Row>
          <Button variant="tonal" onClick={() => setDialogOpen(true)}>
            Full-screen dialog
          </Button>
          <Button variant="tonal" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <Button variant="tonal" onClick={() => setSheetOpen(true)}>
            Side sheet
          </Button>
          <Button
            variant="tonal"
            onClick={() =>
              showSnackbar({
                message: "Published. The live site updates after a rebuild.",
                actionLabel: "Rebuild",
                onAction: () => undefined,
              })
            }
          >
            Snackbar
          </Button>
          <Button
            variant="tonal"
            onClick={() => showSnackbar({ message: "Could not save draft", tone: "error" })}
          >
            Error snackbar
          </Button>
        </Row>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Edit team member"
          fullScreenOnMobile
          confirmLabel="Save"
          onConfirm={() => setDialogOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <TextField label="Name" defaultValue="Debajit Mallick" />
            <TextField label="Description" multiline />
          </div>
        </Dialog>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          icon="delete"
          destructive
          title="Delete this speaker?"
          description="They will be removed from the draft. The live site changes only after you publish."
          confirmLabel="Delete"
          onConfirm={() => setConfirmOpen(false)}
        />
        <SideSheet open={sheetOpen} onOpenChange={setSheetOpen} title="History">
          <List>
            <ListItem headline="Published" supportingText="22 Oct 2026 · debajit13" />
            <ListItem headline="Published" supportingText="20 Oct 2026 · someone" />
          </List>
        </SideSheet>
      </Section>
    </div>
  );
}

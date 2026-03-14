import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatDateTime } from "@/utils/dateTime";
import { formatDistanceKm } from "@/utils/geo";
import {
  buildDestinationHref,
  formatEventType,
  getRelativeDateLabel,
} from "../discoveryUtils";
import {
  DISCOVERY_ACTION_BUTTON_SX,
  SECTION_CARD_SX,
} from "../discoveryStyles";

export function DiscoveryMetricCard({ label, value, subtext }) {
  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {subtext}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DiscoverySection({ title, subtitle, action, children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-end" }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

export function SectionCountBadge({ value }) {
  return (
    <Box
      component="span"
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(96, 165, 250, 0.16)",
        border: "1px solid rgba(96, 165, 250, 0.3)",
        color: "secondary.main",
        fontSize: "0.85rem",
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        boxShadow: "0 8px 20px rgba(8, 10, 22, 0.24)",
      }}
    >
      {value}
    </Box>
  );
}

export function SpotCard({
  item,
  location,
  directionsProvider,
  title,
  body,
  chips = [],
  onOpenOnMap,
  secondaryActionLabel = "Open Map",
}) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: item,
    provider: directionsProvider,
  });
  const hasSourceLink = Boolean(item?.sourceLinks?.length);
  const actionCount =
    Number(Boolean(directionsHref)) + Number(Boolean(onOpenOnMap));

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1.5}
          alignItems="flex-start"
        >
          <Typography
            variant="h6"
            sx={{
              flex: 1,
              minWidth: 0,
              pr: 1.5,
              lineHeight: 1.35,
              minHeight: "2.7em",
              display: "-webkit-box",
              overflow: "hidden",
              textOverflow: "ellipsis",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "secondary.main",
              whiteSpace: "nowrap",
              flexShrink: 0,
              pt: 0.25,
            }}
          >
            {formatDistanceKm(item?.distanceKm)}
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {body}
          </Typography>

          {chips.length ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {chips.map((chip) => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  color={chip.color || "default"}
                  variant={chip.variant || "filled"}
                  size="small"
                />
              ))}
            </Stack>
          ) : null}

          {hasSourceLink ? (
            <Link
              href={item.sourceLinks[0]}
              target="_blank"
              rel="noreferrer"
              underline="hover"
              sx={{ color: "secondary.main", alignSelf: "flex-start" }}
            >
              Source
            </Link>
          ) : null}
        </Box>
      </CardContent>
      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          mt: "auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(actionCount, 1)}, minmax(0, 1fr))`,
          gap: { xs: 1, sm: 1.25 },
          gridAutoRows: "1fr",
          "& > :not(style) ~ :not(style)": {
            marginLeft: 0,
          },
        }}
      >
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
            fullWidth
          >
            Directions
          </Button>
        ) : null}
        {onOpenOnMap ? (
          <Button onClick={onOpenOnMap} variant="outlined" fullWidth>
            {secondaryActionLabel}
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
}

export function EventCard({
  event,
  location,
  directionsProvider,
  referenceNow,
  onOpenOnMap,
  onRsvpAction,
  rsvpActionLabel = "RSVP",
  isRsvpPending = false,
  isJoined = false,
}) {
  const directionsHref = buildDestinationHref({
    origin: location,
    destination: event,
    provider: directionsProvider,
  });
  const actionCount =
    Number(Boolean(directionsHref)) +
    Number(Boolean(onOpenOnMap)) +
    Number(Boolean(onRsvpAction));

  return (
    <Card sx={SECTION_CARD_SX}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}
      >
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Typography variant="h6">{event.title}</Typography>
          <Typography variant="body2" sx={{ color: "secondary.main" }}>
            {formatDistanceKm(event.distanceKm)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={formatEventType(event.eventType)} size="small" />
          <Chip
            label={getRelativeDateLabel(event.startsAt, referenceNow)}
            size="small"
          />
          <Chip
            label={
              Array.isArray(event.rsvps)
                ? `${event.rsvps.length} RSVPs`
                : "0 RSVPs"
            }
            size="small"
            variant="outlined"
          />
        </Stack>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {formatDateTime(event.startsAt, { includeYear: true })}
          {event.endsAt
            ? ` to ${formatDateTime(event.endsAt, { includeYear: true })}`
            : ""}
        </Typography>

        {event.meetupDetails ? (
          <Typography variant="body2">{event.meetupDetails}</Typography>
        ) : null}

        {event.description ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {event.description}
          </Typography>
        ) : null}

        {event.hostChecklist?.length ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {event.hostChecklist.slice(0, 4).map((entry) => (
              <Chip key={entry} label={entry} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : null}
      </CardContent>
      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          mt: "auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(actionCount, 1)}, minmax(0, 1fr))`,
          gap: 1.25,
          "& > :not(style) ~ :not(style)": {
            marginLeft: 0,
          },
        }}
      >
        {directionsHref ? (
          <Button
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            color="secondary"
            fullWidth
            sx={DISCOVERY_ACTION_BUTTON_SX}
          >
            Directions
          </Button>
        ) : null}
        {onOpenOnMap ? (
          <Button
            onClick={onOpenOnMap}
            variant="outlined"
            fullWidth
            sx={DISCOVERY_ACTION_BUTTON_SX}
          >
            Open Map
          </Button>
        ) : null}
        {onRsvpAction ? (
          <Button
            onClick={onRsvpAction}
            variant={isJoined ? "contained" : "outlined"}
            color={isJoined ? "success" : "inherit"}
            disabled={isRsvpPending}
            fullWidth
            sx={DISCOVERY_ACTION_BUTTON_SX}
          >
            {isRsvpPending ? "Saving..." : rsvpActionLabel}
          </Button>
        ) : null}
      </CardActions>
    </Card>
  );
}

export function EmptyStateCard({ title, body, action }) {
  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {body}
        </Typography>
        {action}
      </CardContent>
    </Card>
  );
}

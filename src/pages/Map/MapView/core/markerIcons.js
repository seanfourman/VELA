import L from "leaflet";
import favoriteFullIcon from "@/assets/icons/favorite-full-icon.svg";
import starFullIcon from "@/assets/icons/star-full-icon.svg";
import partyHornIcon from "@/assets/icons/party-horn-svgrepo-com.svg";
import eventIcon from "@/assets/icons/event-svgrepo-com.svg";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `
    <div class="marker-pin">
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const pinIcon = new L.DivIcon({
  className: "custom-marker placed-pin",
  html: `
    <div class="marker-pin placed">
      <div class="marker-dot placed"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const pinIconRemoving = new L.DivIcon({
  className: "custom-marker placed-pin removing",
  html: `
    <div class="marker-pin placed removing">
      <div class="marker-dot placed removing"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoritePinIconRemoving = new L.DivIcon({
  className: "custom-marker favorite-marker removing",
  html: `
    <div class="marker-pin favorite-pin removing">
      <div class="marker-dot favorite-dot removing">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const darkSpotIcon = new L.DivIcon({
  className: "custom-marker dark-spot-marker",
  html: `
    <div class="marker-pin dark-spot">
      <div class="marker-pulse"></div>
      <div class="marker-dot dark-spot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const darkSpotIconRemoving = new L.DivIcon({
  className: "custom-marker dark-spot-marker removing",
  html: `
    <div class="marker-pin dark-spot removing">
      <div class="marker-pulse"></div>
      <div class="marker-dot dark-spot removing"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const stargazeIcon = new L.DivIcon({
  className: "custom-marker stargaze-marker",
  html: `
    <div class="marker-pin stargaze-pin">
      <div class="marker-dot stargaze-dot">
        <img class="stargaze-star" src="${starFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const stargazeIconRemoving = new L.DivIcon({
  className: "custom-marker stargaze-marker removing",
  html: `
    <div class="marker-pin stargaze-pin removing">
      <div class="marker-dot stargaze-dot removing">
        <img class="stargaze-star" src="${starFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoriteSpotIcon = new L.DivIcon({
  className: "custom-marker favorite-marker",
  html: `
    <div class="marker-pin favorite-pin">
      <div class="marker-dot favorite-dot">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoriteSpotIconTransition = new L.DivIcon({
  className: "custom-marker favorite-marker favorite-transition",
  html: `
    <div class="marker-pin favorite-pin">
      <div class="marker-dot favorite-dot">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const starPartyEventIcon = new L.DivIcon({
  className: "custom-marker party-event-marker",
  html: `
    <div class="marker-pin party-event-pin">
      <div class="marker-dot party-event-dot">
        <img class="party-event-symbol" src="${partyHornIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const starPartyEventIconRemoving = new L.DivIcon({
  className: "custom-marker party-event-marker removing",
  html: `
    <div class="marker-pin party-event-pin removing">
      <div class="marker-dot party-event-dot removing">
        <img class="party-event-symbol" src="${partyHornIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const specialEventIcon = new L.DivIcon({
  className: "custom-marker special-event-marker",
  html: `
    <div class="marker-pin special-event-pin">
      <div class="marker-dot special-event-dot">
        <img class="special-event-symbol" src="${eventIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const specialEventIconRemoving = new L.DivIcon({
  className: "custom-marker special-event-marker removing",
  html: `
    <div class="marker-pin special-event-pin removing">
      <div class="marker-dot special-event-dot removing">
        <img class="special-event-symbol" src="${eventIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export {
  customIcon,
  pinIcon,
  pinIconRemoving,
  favoritePinIconRemoving,
  darkSpotIcon,
  darkSpotIconRemoving,
  stargazeIcon,
  stargazeIconRemoving,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
  starPartyEventIcon,
  starPartyEventIconRemoving,
  specialEventIcon,
  specialEventIconRemoving,
};

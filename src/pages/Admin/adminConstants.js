export const EMPTY_LOCATION = {
  id: "",
  name: "",
  country: "",
  region: "",
  type: "",
  bestTime: "",
  lat: "",
  lng: "",
  description: "",
  photoUrls: "",
  sourceUrls: "",
};

export const INPUT_FIELDS = [
  {
    key: "name",
    label: "Name",
    className: "admin-grid-span-2",
    placeholder: "Joshua Tree National Park",
  },
  {
    key: "country",
    label: "Country",
    className: "admin-grid-span-2",
    placeholder: "Portugal",
  },
  {
    key: "region",
    label: "Region",
    className: "admin-grid-span-2",
    placeholder: "Alentejo (near Reguengos de Monsaraz)",
  },
  {
    key: "type",
    label: "Type",
    className: "admin-grid-span-3",
    placeholder: "Dark-sky observatory / stargazing center",
  },
  {
    key: "bestTime",
    label: "Best time",
    className: "admin-grid-span-3",
    placeholder: "Clear summer nights; new Moon for deep-sky",
  },
  {
    key: "lat",
    label: "Latitude",
    className: "admin-grid-span-3",
    type: "number",
    step: "0.0001",
    min: "-90",
    max: "90",
    placeholder: "34.1341",
  },
  {
    key: "lng",
    label: "Longitude",
    className: "admin-grid-span-3",
    type: "number",
    step: "0.0001",
    min: "-180",
    max: "180",
    placeholder: "-116.3131",
  },
];

export const TEXTAREAS = [
  {
    key: "description",
    label: "Description",
    placeholder: "High desert skies with minimal light pollution.",
  },
  {
    key: "photoUrls",
    label: "Photo source URLs",
    placeholder: "https://example.com/gallery",
    note: "Separate multiple URLs with commas or new lines.",
  },
  {
    key: "sourceUrls",
    label: "Source URLs",
    placeholder: "https://example.com/official-site",
    note: "Separate multiple URLs with commas or new lines.",
  },
];

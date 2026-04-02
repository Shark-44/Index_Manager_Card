export const TYPE_ROLE = {
    light: "actionneurs",
    switch: "actionneurs",
    cover: "actionneurs",
    climate: "actionneurs",
    media_player: "actionneurs",
    fan: "actionneurs",
    sensor: "recepteurs",
    binary_sensor: "recepteurs",
    weather: "recepteurs",
    sun: "recepteurs",
  };
  
  export const TYPE_ICONS = {
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch",
    cover: "mdi:window-shutter",
    climate: "mdi:thermometer",
    media_player: "mdi:television-play",
    fan: "mdi:fan",
    sensor: "mdi:eye",
    binary_sensor: "mdi:radiobox-marked",
    weather: "mdi:weather-partly-cloudy",
    sun: "mdi:weather-sunny",
  };
  
  export function getType(entity) {
    return entity.split(".")[0];
  }
  
  export function getRole(entity) {
    const type = getType(entity);
    return TYPE_ROLE[type] || "actionneurs";
  }
  
  export function getIcon(entity) {
    const type = getType(entity);
    return TYPE_ICONS[type] || "mdi:help-circle-outline";
  }
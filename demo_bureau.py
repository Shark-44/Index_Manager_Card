import appdaemon.plugins.hass.hassapi as hass
import yaml


class DemoBureau(hass.Hass):

    def initialize(self):
        self.index_path = "/homeassistant/index.yaml"

        # Charger l'index et récupérer les entités du Bureau
        index     = self.load_index()
        bureau    = index["pieces"].get("Bureau", {})
        actionneurs = bureau.get("actionneurs", [])

        # Chercher les entités par id
        self.eclairage = self._get_entity(actionneurs, "Eclairage_bureau")
        self.spot      = self._get_entity(actionneurs, "Spot_bureau")

        if not self.eclairage or not self.spot:
            self.log("Entités introuvables dans index.yaml", level="WARNING")
            return

        # Quand Eclairage_bureau s'allume → allumer Spot_bureau
        self.listen_state(self.on_eclairage_change, self.eclairage, new="on")
        # Quand Eclairage_bureau s'éteint → éteindre Spot_bureau
        self.listen_state(self.on_eclairage_change, self.eclairage, new="off")

        self.log(f"DemoBureau démarrée — écoute {self.eclairage}")

    def load_index(self):
        try:
            with open(self.index_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {"pieces": {}}
        except Exception as e:
            self.log(f"Erreur lecture index.yaml : {e}", level="ERROR")
            return {"pieces": {}}

    def _get_entity(self, composants, cid):
        """Retourne l'entity d'un composant par son id."""
        for c in composants:
            if c["id"] == cid:
                return c["entity"]
        return None

    def on_eclairage_change(self, entity, attribute, old, new, kwargs):
        self.log(f"{entity} → {new} | {self.spot} suit")
        if new == "on":
            self.turn_on(self.spot)
        else:
            self.turn_off(self.spot)


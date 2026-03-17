import appdaemon.plugins.hass.hassapi as hass
import yaml
import json
import os


class IndexAPI(hass.Hass):

    def initialize(self):
        self.index_path = "/homeassistant/index.yaml"

        if not os.path.exists(self.index_path):
            self.save_index({"pieces": {}})
            self.log("index.yaml cree automatiquement")

        self.register_endpoint(self.pieces_endpoint,    "pieces")
        self.register_endpoint(self.composant_endpoint, "composant")

        self.log("IndexAPI demarree - endpoints enregistres")

    # ------------------------------------------------------------------
    # Lecture / écriture YAML
    # ------------------------------------------------------------------

    def load_index(self):
        try:
            with open(self.index_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {"pieces": {}}
        except Exception as e:
            self.log(f"Erreur lecture : {e}", level="ERROR")
            return {"pieces": {}}

    def save_index(self, data):
        try:
            with open(self.index_path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        except Exception as e:
            self.log(f"Erreur ecriture : {e}", level="ERROR")

    # ------------------------------------------------------------------
    # Utilitaire : lit le body quelle que soit la source
    # ------------------------------------------------------------------

    async def _get_body(self, data, kwargs):
        if isinstance(data, dict):
            return data
        if isinstance(data, str) and data.strip():
            try:
                return json.loads(data)
            except Exception:
                return {}
        req = kwargs.get("request")
        if req:
            try:
                raw = await req.text()
                if raw.strip():
                    return json.loads(raw)
            except Exception:
                pass
        return {}

    # ------------------------------------------------------------------
    # Endpoint /api/appdaemon/pieces
    #   GET                          → liste toutes les pièces
    #   POST { nom }                 → ajoute une pièce
    #   POST { nom, action:"delete"} → supprime une pièce
    # ------------------------------------------------------------------

    async def pieces_endpoint(self, data, kwargs):
        req    = kwargs.get("request")
        method = req.method if req else "POST"

        if method == "OPTIONS":
            return {}, 200

        if method == "GET":
            index = self.load_index()
            return index["pieces"], 200

        if method == "POST":
            body   = await self._get_body(data, kwargs)
            nom    = body.get("nom")
            action = body.get("action", "add")  # "add" par défaut, "delete" pour suppression

            if not nom:
                return {"error": "nom requis"}, 400

            index = self.load_index()

            if action == "delete":
                if nom not in index["pieces"]:
                    return {"error": f"'{nom}' introuvable"}, 404
                del index["pieces"][nom]
                self.save_index(index)
                self.log(f"Piece supprimee : {nom}")
                return {"message": f"'{nom}' supprimee"}, 200

            else:  # action == "add"
                if nom in index["pieces"]:
                    return {"error": f"'{nom}' existe deja"}, 409
                index["pieces"][nom] = {"actionneurs": [], "recepteurs": []}
                self.save_index(index)
                self.log(f"Piece ajoutee : {nom}")
                return {"message": f"'{nom}' ajoutee"}, 201

        return {"error": "Methode non supportee"}, 405

    # ------------------------------------------------------------------
    # Endpoint /api/appdaemon/composant
    #   POST { ..., action:"add" }    → ajoute un composant
    #   POST { ..., action:"update" } → modifie un composant
    #   POST { ..., action:"delete" } → supprime un composant
    # ------------------------------------------------------------------

    async def composant_endpoint(self, data, kwargs):
        req    = kwargs.get("request")
        method = req.method if req else "POST"

        if method == "OPTIONS":
            return {}, 200

        if method != "POST":
            return {"error": "Methode non supportee"}, 405

        body   = await self._get_body(data, kwargs)
        action = body.get("action", "add")
        piece  = body.get("piece")
        role   = body.get("role")
        cid    = body.get("id")

        if not all([piece, role, cid]):
            return {"error": "Champs requis : piece, role, id"}, 400

        if role not in ("actionneurs", "recepteurs"):
            return {"error": "role doit etre 'actionneurs' ou 'recepteurs'"}, 400

        index = self.load_index()

        if piece not in index["pieces"]:
            return {"error": f"'{piece}' introuvable"}, 404

        liste = index["pieces"][piece][role]

        # ---- add ----
        if action == "add":
            entity = body.get("entity")
            ctype  = body.get("type")
            if not all([entity, ctype]):
                return {"error": "Champs requis pour ajout : entity, type"}, 400
            for c in liste:
                if c["id"] == cid:
                    return {"error": f"'{cid}' existe deja"}, 409
            liste.append({"id": cid, "entity": entity, "type": ctype})
            self.save_index(index)
            self.log(f"Composant ajoute : {cid} dans {piece}/{role}")
            return {"message": f"'{cid}' ajoute dans '{piece}'"}, 201

        # ---- update ----
        if action == "update":
            for c in liste:
                if c["id"] == cid:
                    if "entity" in body:
                        c["entity"] = body["entity"]
                    if "type" in body:
                        c["type"] = body["type"]
                    self.save_index(index)
                    self.log(f"Composant mis a jour : {cid} dans {piece}/{role}")
                    return {"message": f"'{cid}' mis a jour"}, 200
            return {"error": f"'{cid}' introuvable"}, 404

        # ---- delete ----
        if action == "delete":
            nouvelle_liste = [c for c in liste if c["id"] != cid]
            if len(nouvelle_liste) == len(liste):
                return {"error": f"'{cid}' introuvable"}, 404
            index["pieces"][piece][role] = nouvelle_liste
            self.save_index(index)
            self.log(f"Composant supprime : {cid} dans {piece}/{role}")
            return {"message": f"'{cid}' supprime de '{piece}'"}, 200

        return {"error": f"action inconnue : {action}"}, 400

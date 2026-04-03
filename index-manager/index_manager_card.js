import { api } from "./api.js";
import { getType, getRole, getIcon } from "./entities.js";
import { translations } from "./i18n/translations.js";

class IndexManagerCard extends HTMLElement {

  // ------------------------------------------------------------------
  // Cycle de vie
  // ------------------------------------------------------------------

constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.pieces          = {};
    this.loading         = true;
    this.error           = null;
    this._newPieceName   = "";
    this._selectedPiece  = null;
    this._showAddForm    = false;
    this._newId          = "";
    this._newEntity      = "";
    this._editComposant  = null;
    this._lang           = "fr";
}

setConfig(config) {
    this.config = config;
}

set hass(hass) {
    const lang = hass?.locale?.language?.toLowerCase().split("-")[0];
    if (lang && lang !== this._lang) {
    this._lang = lang;
    this._render();
    }
}

connectedCallback() {
    this._getPieces();
}

  // ------------------------------------------------------------------
  // Traductions
  // ------------------------------------------------------------------

_t(key, vars = {}) {
    let str = translations[this._lang]?.[key]
        || translations["fr"]?.[key]
        || key;
    Object.keys(vars).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
    });
    return str;
}

  // ------------------------------------------------------------------
  // API
  // ------------------------------------------------------------------

async _getPieces() {
    try {
    this.loading = true;
    this.error   = null;
    this._render();
    this.pieces = { ...await api("pieces", "GET") };
    } catch (e) {
    this.error = e.message || this._t("error_api");
    } finally {
    this.loading = false;
    this._render();
    }
}

async _addPiece() {
    const nom = this._newPieceName.trim();
    if (!nom) { this.error = this._t("error_required_fields"); this._render(); return; }
    try {
    this.error = null;
    await api("pieces", "POST", { nom });
    this._newPieceName = "";
    await this._getPieces();
    } catch (e) {
    this.error = e.message || this._t("error_add");
    this._render();
    }
}

async _deletePiece(nom) {
    if (!confirm(this._t("confirm_delete_room", { name: nom }))) return;
    try {
    this.error = null;
    await api("pieces", "POST", { nom, action: "delete" });
    await this._getPieces();
    } catch (e) {
    this.error = e.message || this._t("error_delete");
    this._render();
    }
}

async _addComposant() {
    const id     = this._newId.trim();
    const entity = this._newEntity.trim();
    if (!id || !entity) { this.error = this._t("error_required_fields"); this._render(); return; }
    const type = getType(entity);
    const role = getRole(entity);
    try {
    this.error = null;
    await api("composant", "POST", { action: "add", piece: this._selectedPiece, role, id, entity, type });
    this._newId       = "";
    this._newEntity   = "";
    this._showAddForm = false;
    await this._getPieces();
    } catch (e) {
    this.error = e.message || this._t("error_add");
    this._render();
    }
}

async _updateComposant(c, newEntity) {
    const type = getType(newEntity);
    const role = getRole(newEntity);
    try {
    this.error = null;
    await api("composant", "POST", { action: "update", piece: this._selectedPiece, role: c.role, id: c.id, entity: newEntity, type });
    this._editComposant = null;
    await this._getPieces();
    } catch (e) {
    this.error = e.message || this._t("error_update");
    this._render();
    }
}

async _deleteComposant(c) {
    if (!confirm(this._t("confirm_delete_component", { name: c.id }))) return;
    try {
    this.error = null;
    await api("composant", "POST", { action: "delete", piece: this._selectedPiece, role: c.role, id: c.id });
    await this._getPieces();
    } catch (e) {
    this.error = e.message || this._t("error_delete");
    this._render();
    }
}

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

_openPiece(nom) {
    this._selectedPiece = nom;
    this._showAddForm   = false;
    this._editComposant = null;
    this.error          = null;
    this._render();
}

_backToList() {
    this._selectedPiece = null;
    this._showAddForm   = false;
    this._editComposant = null;
    this.error          = null;
    this._render();
}

  // ------------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------------

_render() {
    this.shadowRoot.innerHTML = `
    <style>${this._css()}</style>
    ${this._selectedPiece ? this._renderDetail() : this._renderListe()}
    `;
    this._bindEvents();
}

_renderListe() {
    const pieces = Object.keys(this.pieces).map(nom => `
    <div class="piece-card" data-nom="${nom}">
        <ha-icon icon="mdi:door"></ha-icon>
        <span>${nom}</span>
        <button class="btn-delete" data-delete-piece="${nom}">
        <ha-icon icon="mdi:trash-can-outline"></ha-icon>
        </button>
    </div>
    `).join("");

    return `
    <ha-card header="${this._t("title_rooms")}">
        <div class="card-content">
        ${this.loading ? `<p>${this._t("loading")}</p>` : ""}
        ${this.error   ? `<p class="error">${this.error}</p>` : ""}
        <div class="pieces-grid">${pieces}</div>
        <h3>${this._t("add_room")}</h3>
        <div class="add-section">
            <input id="new-piece-name" type="text" placeholder="${this._t("room_name_placeholder")}" value="${this._newPieceName}" />
            <button id="btn-add-piece">${this._t("add")}</button>
        </div>
        </div>
    </ha-card>
    `;
}

_renderDetail() {
    const piece       = this.pieces[this._selectedPiece];
    const actionneurs = (piece?.actionneurs || []).map(c => ({ ...c, role: "actionneurs" }));
    const recepteurs  = (piece?.recepteurs  || []).map(c => ({ ...c, role: "recepteurs" }));

    const renderSection = (label, list) => list.length === 0 ? "" : `
    <h4 class="section-title">${label}</h4>
    <div class="composants-grid">
        ${list.map(c => this._renderComposant(c)).join("")}
    </div>
    `;

    const formHint = this._newEntity
    ? `${this._t("role_hint")} <b>${getRole(this._newEntity)}</b>, ${this._t("type_hint")} <b>${getType(this._newEntity)}</b>`
    : "";

    const addForm = this._showAddForm ? `
    <div class="add-form">
        <h4 class="section-title">${this._t("new_component")}</h4>
        <input id="new-id" type="text" placeholder="${this._t("component_id")}" value="${this._newId}" />
        <input id="new-entity" type="text" placeholder="${this._t("component_entity")}" value="${this._newEntity}" />
        <div class="form-hint">${formHint}</div>
        <div class="form-actions">
        <button id="btn-confirm-add">${this._t("confirm")}</button>
        <button id="btn-cancel-add" class="btn-cancel">${this._t("cancel")}</button>
        </div>
    </div>
    ` : `
    <button id="btn-show-add" class="btn-add-composant">
        <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
        ${this._t("add_component")}
    </button>
    `;

    return `
    <ha-card header="${this._selectedPiece}">
        <div class="card-content">
        <div class="detail-header">
            <button id="btn-back" class="btn-back">
            <ha-icon icon="mdi:arrow-left"></ha-icon>
            ${this._t("back")}
            </button>
        </div>
        ${this.error ? `<p class="error">${this.error}</p>` : ""}
        ${renderSection(this._t("actuators"), actionneurs)}
        ${renderSection(this._t("sensors"), recepteurs)}
        ${addForm}
        </div>
    </ha-card>
    `;
}

_renderComposant(c) {
    const isEditing = this._editComposant?.id === c.id && this._editComposant?.role === c.role;
    const icon      = getIcon(c.entity);
    const key       = `${c.role}__${c.id}`;

    if (isEditing) {
    return `
        <div class="composant-card">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="composant-nom">${c.id}</span>
        <input class="edit-input" type="text" data-edit-key="${key}" value="${this._editComposant.newEntity}" />
        <div class="composant-actions">
            <button class="btn-icon" data-confirm-edit="${key}" title="${this._t("confirm")}">
            <ha-icon icon="mdi:check"></ha-icon>
            </button>
            <button class="btn-icon" data-cancel-edit title="${this._t("cancel")}">
            <ha-icon icon="mdi:close"></ha-icon>
            </button>
        </div>
        </div>
    `;
    }

    return `
    <div class="composant-card">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="composant-nom">${c.id}</span>
        <span class="composant-entity">${c.entity}</span>
        <div class="composant-actions">
        <button class="btn-icon" data-edit-composant="${key}" data-entity="${c.entity}" title="${this._t("edit_component")}">
            <ha-icon icon="mdi:pencil"></ha-icon>
        </button>
        <button class="btn-icon btn-danger" data-delete-composant="${key}" title="${this._t("delete")}">
            <ha-icon icon="mdi:trash-can-outline"></ha-icon>
        </button>
        </div>
    </div>
    `;
}

  // ------------------------------------------------------------------
  // Binding des événements
  // ------------------------------------------------------------------

_bindEvents() {
    const s = this.shadowRoot;

    // Liste pièces
    s.querySelectorAll(".piece-card").forEach(el => {
    el.addEventListener("click", () => this._openPiece(el.dataset.nom));
    });

    s.querySelectorAll("[data-delete-piece]").forEach(btn => {
    btn.addEventListener("click", e => {
        e.stopPropagation();
        this._deletePiece(btn.dataset.deletePiece);
    });
    });

    const inputPiece = s.getElementById("new-piece-name");
    if (inputPiece) {
    inputPiece.addEventListener("input",   e => this._newPieceName = e.target.value);
    inputPiece.addEventListener("keydown", e => e.key === "Enter" && this._addPiece());
    }

    s.getElementById("btn-add-piece")?.addEventListener("click", () => this._addPiece());

    // Détail pièce
    s.getElementById("btn-back")?.addEventListener("click", () => this._backToList());
    s.getElementById("btn-show-add")?.addEventListener("click", () => { this._showAddForm = true; this._render(); });
    s.getElementById("btn-cancel-add")?.addEventListener("click", () => { this._showAddForm = false; this.error = null; this._render(); });
    s.getElementById("btn-confirm-add")?.addEventListener("click", () => this._addComposant());

    const inputId = s.getElementById("new-id");
    if (inputId) inputId.addEventListener("input", e => { this._newId = e.target.value; });

    const inputEntity = s.getElementById("new-entity");
    if (inputEntity) {
    inputEntity.addEventListener("input", e => {
        this._newEntity = e.target.value;
        this._render();
    });
    }

    // Composants
    s.querySelectorAll("[data-edit-composant]").forEach(btn => {
    btn.addEventListener("click", () => {
        const [role, id] = btn.dataset.editComposant.split("__");
        this._editComposant = { id, role, newEntity: btn.dataset.entity };
        this._render();
    });
    });

    s.querySelectorAll("[data-delete-composant]").forEach(btn => {
    btn.addEventListener("click", () => {
        const [role, id] = btn.dataset.deleteComposant.split("__");
        this._deleteComposant({ id, role });
    });
    });

    s.querySelectorAll("[data-edit-key]").forEach(input => {
    input.addEventListener("input", e => {
        this._editComposant = { ...this._editComposant, newEntity: e.target.value };
    });
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
        const [role, id] = input.dataset.editKey.split("__");
        this._updateComposant({ id, role }, this._editComposant.newEntity);
        }
    });
    });

    s.querySelectorAll("[data-confirm-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
        const [role, id] = btn.dataset.confirmEdit.split("__");
        this._updateComposant({ id, role }, this._editComposant.newEntity);
    });
    });

    s.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    this._editComposant = null;
    this._render();
    });
}

  // ------------------------------------------------------------------
  // CSS
  // ------------------------------------------------------------------

_css() {
    return `
    :host { display: block; }
    .card-content { padding: 16px; }
    .error { color: var(--error-color, red); font-size: 0.9em; }

    .pieces-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .piece-card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 15px 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
        min-width: 80px;
    }
    .piece-card:hover { background: var(--primary-color); color: white; }
    .piece-card span  { font-weight: 500; font-size: 0.9em; }
    .btn-delete {
        position: absolute;
        top: 4px; right: 4px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: var(--secondary-text-color);
        opacity: 0;
        transition: opacity 0.2s;
    }
    .piece-card:hover .btn-delete { opacity: 1; color: white; }

    h3 { font-size: 0.95em; margin: 8px 0; color: var(--secondary-text-color); }
    .add-section { display: flex; gap: 8px; }

    input {
        flex: 1;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 1em;
        width: 100%;
        box-sizing: border-box;
    }
    button {
        padding: 8px 14px;
        border: none;
        border-radius: 4px;
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        cursor: pointer;
        font-size: 0.9em;
    }
    button:hover { opacity: 0.85; }

    .detail-header { margin-bottom: 16px; }
    .btn-back {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.9em;
    }
    .section-title {
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--secondary-text-color);
        margin: 16px 0 8px 0;
    }
    .composants-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .composant-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
        min-width: 90px;
    }
    .composant-nom    { font-weight: 500; font-size: 0.9em; }
    .composant-entity { font-size: 0.75em; color: var(--secondary-text-color); }
    .composant-actions { display: flex; gap: 4px; margin-top: 4px; }
    .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px;
        color: var(--secondary-text-color);
        border-radius: 4px;
    }
    .btn-icon:hover   { color: var(--primary-color); background: transparent; opacity: 1; }
    .btn-danger:hover { color: var(--error-color, red); }
    .edit-input       { font-size: 0.8em; padding: 4px; margin-top: 4px; }

    .add-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
        padding: 12px;
        background: var(--secondary-background-color);
        border-radius: 8px;
    }
    .form-hint    { font-size: 0.8em; color: var(--secondary-text-color); min-height: 1.2em; }
    .form-actions { display: flex; gap: 8px; }
    .btn-cancel {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
    }
    .btn-add-composant {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        width: 100%;
        padding: 10px;
        border-radius: 8px;
        font-size: 0.9em;
        margin-top: 16px;
    }
    `;
}
}

customElements.define("index-manager-card", IndexManagerCard);
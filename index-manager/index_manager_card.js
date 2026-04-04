import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { api } from "./api.js";
import { getType, getRole, getIcon } from "./entities.js";
import { translations } from "./i18n/translations.js";

class IndexManagerCard extends LitElement {

  // ------------------------------------------------------------------
  // Propriétés réactives
  // ------------------------------------------------------------------

  static properties = {
    pieces:         { type: Object, state: true },
    loading:        { type: Boolean, state: true },
    error:          { type: String,  state: true },
    _newPieceName:  { type: String,  state: true },
    _selectedPiece: { type: String,  state: true },
    _showAddForm:   { type: Boolean, state: true },
    _newId:         { type: String,  state: true },
    _newEntity:     { type: String,  state: true },
    _editComposant: { type: Object,  state: true },
    _lang:          { type: String,  state: true },
  };

  // ------------------------------------------------------------------
  // Cycle de vie
  // ------------------------------------------------------------------

  constructor() {
    super();
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
    }
  }

  connectedCallback() {
    super.connectedCallback();
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
      this.pieces  = { ...await api("pieces", "GET") };
    } catch (e) {
      this.error = e.message || this._t("error_api");
    } finally {
      this.loading = false;
    }
  }

  async _addPiece() {
    const nom = this._newPieceName.trim();
    if (!nom) { this.error = this._t("error_required_fields"); return; }
    try {
      this.error = null;
      await api("pieces", "POST", { nom });
      this._newPieceName = "";
      await this._getPieces();
    } catch (e) {
      this.error = e.message || this._t("error_add");
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
    }
  }

  async _addComposant() {
    const id     = this._newId.trim();
    const entity = this._newEntity.trim();
    if (!id || !entity) { this.error = this._t("error_required_fields"); return; }
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
  }

  _backToList() {
    this._selectedPiece = null;
    this._showAddForm   = false;
    this._editComposant = null;
    this.error          = null;
  }

  // ------------------------------------------------------------------
  // Rendu 
  // ------------------------------------------------------------------

  render() {
    return html`
      ${this._selectedPiece ? this._renderDetail() : this._renderListe()}
    `;
  }

  _renderListe() {
    return html`
      <ha-card header="${this._t("title_rooms")}">
        <div class="card-content">
          ${this.loading ? html`<p>${this._t("loading")}</p>` : ""}
          ${this.error   ? html`<p class="error">${this.error}</p>` : ""}

          <div class="pieces-grid">
            ${Object.keys(this.pieces).map(nom => html`
              <div class="piece-card" @click=${() => this._openPiece(nom)}>
                <ha-icon icon="mdi:door"></ha-icon>
                <span>${nom}</span>
                <button class="btn-delete"
                  @click=${e => { e.stopPropagation(); this._deletePiece(nom); }}>
                  <ha-icon icon="mdi:trash-can-outline"></ha-icon>
                </button>
              </div>
            `)}
          </div>

          <h3>${this._t("add_room")}</h3>
          <div class="add-section">
            <input
              type="text"
              placeholder="${this._t("room_name_placeholder")}"
              .value=${this._newPieceName}
              @input=${e  => { this._newPieceName = e.target.value; }}
              @keydown=${e => e.key === "Enter" && this._addPiece()}
            />
            <button @click=${() => this._addPiece()}>${this._t("add")}</button>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderDetail() {
    const piece       = this.pieces[this._selectedPiece];
    const actionneurs = (piece?.actionneurs || []).map(c => ({ ...c, role: "actionneurs" }));
    const recepteurs  = (piece?.recepteurs  || []).map(c => ({ ...c, role: "recepteurs" }));

    const formHint = this._newEntity
      ? html`${this._t("role_hint")} <b>${getRole(this._newEntity)}</b>, ${this._t("type_hint")} <b>${getType(this._newEntity)}</b>`
      : "";

    return html`
      <ha-card header="${this._selectedPiece}">
        <div class="card-content">

          <div class="detail-header">
            <button class="btn-back" @click=${() => this._backToList()}>
              <ha-icon icon="mdi:arrow-left"></ha-icon>
              ${this._t("back")}
            </button>
          </div>

          ${this.error ? html`<p class="error">${this.error}</p>` : ""}

          ${actionneurs.length ? html`
            <h4 class="section-title">${this._t("actuators")}</h4>
            <div class="composants-grid">
              ${actionneurs.map(c => this._renderComposant(c))}
            </div>
          ` : ""}

          ${recepteurs.length ? html`
            <h4 class="section-title">${this._t("sensors")}</h4>
            <div class="composants-grid">
              ${recepteurs.map(c => this._renderComposant(c))}
            </div>
          ` : ""}

          ${this._showAddForm ? html`
            <div class="add-form">
              <h4 class="section-title">${this._t("new_component")}</h4>
              <input
                type="text"
                placeholder="${this._t("component_id")}"
                .value=${this._newId}
                @input=${e => { this._newId = e.target.value; }}
              />
              <input
                type="text"
                placeholder="${this._t("component_entity")}"
                .value=${this._newEntity}
                @input=${e => { this._newEntity = e.target.value; }}
              />
              <div class="form-hint">${formHint}</div>
              <div class="form-actions">
                <button @click=${() => this._addComposant()}>${this._t("confirm")}</button>
                <button class="btn-cancel"
                  @click=${() => { this._showAddForm = false; this.error = null; }}>
                  ${this._t("cancel")}
                </button>
              </div>
            </div>
          ` : html`
            <button class="btn-add-composant"
              @click=${() => { this._showAddForm = true; }}>
              <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
              ${this._t("add_component")}
            </button>
          `}

        </div>
      </ha-card>
    `;
  }

  _renderComposant(c) {
    const isEditing = this._editComposant?.id === c.id && this._editComposant?.role === c.role;
    const icon      = getIcon(c.entity);

    if (isEditing) {
      return html`
        <div class="composant-card">
          <ha-icon icon="${icon}"></ha-icon>
          <span class="composant-nom">${c.id}</span>
          <input
            class="edit-input"
            type="text"
            .value=${this._editComposant.newEntity}
            @input=${e => { this._editComposant = { ...this._editComposant, newEntity: e.target.value }; }}
            @keydown=${e => e.key === "Enter" && this._updateComposant(c, this._editComposant.newEntity)}
          />
          <div class="composant-actions">
            <button class="btn-icon"
              title="${this._t("confirm")}"
              @click=${() => this._updateComposant(c, this._editComposant.newEntity)}>
              <ha-icon icon="mdi:check"></ha-icon>
            </button>
            <button class="btn-icon"
              title="${this._t("cancel")}"
              @click=${() => { this._editComposant = null; }}>
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <div class="composant-card">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="composant-nom">${c.id}</span>
        <span class="composant-entity">${c.entity}</span>
        <div class="composant-actions">
          <button class="btn-icon"
            title="${this._t("edit_component")}"
            @click=${() => { this._editComposant = { id: c.id, role: c.role, newEntity: c.entity }; }}>
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
          <button class="btn-icon btn-danger"
            title="${this._t("delete")}"
            @click=${() => this._deleteComposant(c)}>
            <ha-icon icon="mdi:trash-can-outline"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // CSS 
  // ------------------------------------------------------------------

  static styles = css`
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

customElements.define("index-manager-card", IndexManagerCard);

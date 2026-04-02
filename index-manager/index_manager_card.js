import { LitElement, html, css } from "https://unpkg.com/lit@2/index.js?module";
import { api } from "./api.js";
import { getType, getRole, getIcon } from "./entities.js";
import { styles } from "./styles.js";
import { translations } from "./i18n/translations.js";


class IndexManagerCard extends LitElement {

  static get properties() {
    return {
      pieces:           { type: Object },
      loading:          { type: Boolean },
      error:            { type: String },
      config:           { type: Object },
      _newPieceName:    { type: String },
      _selectedPiece:   { type: String },
      _showAddForm:     { type: Boolean },  
      _newId:           { type: String },
      _newEntity:       { type: String },
      _editComposant:   { type: Object },
      hass: { type: Object },   
    };
  }

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
    this.lang = "fr";
  }

  setConfig(config) {
    this.config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    this._getPieces();
  }

  get _lang() {
    return this.hass?.locale?.language?.toLowerCase().split("-")[0] || this.lang;
  }
  
  _t(key, vars = {}) {
    let str = translations[this._lang]?.[key] 
           || translations["fr"]?.[key] 
           || key;
    
    Object.keys(vars).forEach(k => {
      str = str.replace(`{${k}}`, vars[k]);
    });
  
    return str;
  }

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
    if (!nom) {
      this.error = this._t("error_required_fields");
      return;
    }
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

  // ------------------------------------------------------------------
  // CRUD composants
  // ------------------------------------------------------------------

  async _addComposant() {
    const id     = this._newId.trim();
    const entity = this._newEntity.trim();

    if (!id || !entity) {
      this.error = this._t("error_required_fields");
      return;
    }

    const type = getType(entity);
    const role = getRole(entity);

    try {
      this.error = null;
      await api("composant", "POST", {
        action: "add",
        piece:  this._selectedPiece,
        role,
        id,
        entity,
        type,
      });
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
      await api("composant", "POST", {
        action: "update",
        piece:  this._selectedPiece,
        role:   c.role,  
        id:     c.id,
        entity: newEntity,
        type,
      });
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
      await api("composant", "POST", {
        action: "delete",
        piece:  this._selectedPiece,
        role:   c.role,
        id:     c.id,
      });
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
  // Rendu principal
  // ------------------------------------------------------------------

  render() {
    return this._selectedPiece
      ? this._renderDetail()
      : this._renderListe();
  }

  // ------------------------------------------------------------------
  // Vue 1 : liste des pièces
  // ------------------------------------------------------------------

  _renderListe() {
    return html`
      <ha-card header="${this._t("title_rooms")}">
        <div class="card-content">

          ${this.loading ? html`<p>${this._t("loading")}</p>` : html``}
          ${this.error   ? html`<p class="error">${this.error}</p>` : html``}

          <div class="pieces-grid">
            ${Object.keys(this.pieces).map(nom => html`
              <div class="piece-card" @click="${() => this._openPiece(nom)}">
                <ha-icon icon="mdi:door"></ha-icon>
                <span>${nom}</span>
                <button class="btn-delete" @click="${(e) => { e.stopPropagation(); this._deletePiece(nom); }}">
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
              .value="${this._newPieceName}"
              @input="${e => this._newPieceName = e.target.value}"
              @keydown="${e => e.key === 'Enter' && this._addPiece()}"
            />
            <button @click="${() => this._addPiece()}">${this._t("add")}</button>
          </div>

        </div>
      </ha-card>
    `;
  }

  // ------------------------------------------------------------------
  // Vue 2 : détail d'une pièce
  // ------------------------------------------------------------------

  _renderDetail() {
    const piece       = this.pieces[this._selectedPiece];

    const actionneurs = (piece?.actionneurs || []).map(c => ({ ...c, role: "actionneurs" }));
    const recepteurs  = (piece?.recepteurs  || []).map(c => ({ ...c, role: "recepteurs" }));
   
    return html`
      <ha-card header="${this._selectedPiece}">
        <div class="card-content">

          <!-- Bouton retour -->
          <div class="detail-header">
            <button class="btn-back" @click="${() => this._backToList()}">
              <ha-icon icon="mdi:arrow-left"></ha-icon>
              ${this._t("back")}
            </button>
          </div>

          ${this.error ? html`<p class="error">${this.error}</p>` : html``}

          <!-- Actionneurs -->
          ${actionneurs.length > 0 ? html`
            <h4 class="section-title">${this._t("actuators")}</h4>
            <div class="composants-grid">
              ${actionneurs.map(c => this._renderComposant(c))}
            </div>
          ` : html``}

          <!-- Récepteurs -->
          ${recepteurs.length > 0 ? html`
            <h4 class="section-title">${this._t("sensors")}</h4>
            <div class="composants-grid">
              ${recepteurs.map(c => this._renderComposant(c))}
            </div>
          ` : html``}

          <!-- Formulaire ajout -->
          ${this._showAddForm
            ? html`
              <div class="add-form">
                <h4 class="section-title">${this._t("new_component")}</h4>
                <input
                  type="text"
                  placeholder="${this._t("component_id")}"
                  .value="${this._newId}"
                  @input="${e => this._newId = e.target.value}"
                />
                <input
                  type="text"
                  placeholder="${this._t("component_entity")}"
                  .value="${this._newEntity}"
                  @input="${e => this._newEntity = e.target.value}"
                />
                <div class="form-hint">
                  ${this._newEntity
                    ? html`${this._t("role_hint")} <b>${getRole(this._newEntity)}</b>, ${this._t("type_hint")} <b>${getType(this._newEntity)}</b>`
                    : html``
                  }
                </div>
                <div class="form-actions">
                  <button @click="${() => this._addComposant()}">${this._t("confirm")}</button>
                  <button class="btn-cancel" @click="${() => { this._showAddForm = false; this.error = null; }}">${this._t("cancel")}</button>
                </div>
              </div>
            `
            : html`
              <button class="btn-add-composant" @click="${() => this._showAddForm = true}">
                <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
                ${this._t("add_component")}
              </button>
            `
          }

        </div>
      </ha-card>
    `;
  }

  // ------------------------------------------------------------------
  // Rendu d'un composant individuel
  // ------------------------------------------------------------------

  _renderComposant(c) {
    const isEditing = this._editComposant?.id === c.id && this._editComposant?.role === c.role;
    const icon      = getIcon(c.entity);

    return html`
      <div class="composant-card">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="composant-nom">${c.id}</span>

        ${isEditing
          ? html`
            <input
              class="edit-input"
              type="text"
              .value="${this._editComposant.newEntity}"
              @input="${e => this._editComposant = { ...this._editComposant, newEntity: e.target.value }}"
              @keydown="${e => e.key === 'Enter' && this._updateComposant(c, this._editComposant.newEntity)}"
            />
            <div class="composant-actions">
              <button class="btn-icon" title="${this._t("confirm")}" @click="${() => this._updateComposant(c, this._editComposant.newEntity)}">
                <ha-icon icon="mdi:check"></ha-icon>
              </button>
              <button class="btn-icon" title="${this._t("cancel")}" @click="${() => this._editComposant = null}">
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            </div>
          `
          : html`
            <span class="composant-entity">${c.entity}</span>
            <div class="composant-actions">
              <button class="btn-icon" title="${this._t("edit_component")}" @click="${() => this._editComposant = { id: c.id, role: c.role, newEntity: c.entity }}">
                <ha-icon icon="mdi:pencil"></ha-icon>
              </button>
              <button class="btn-icon btn-danger" title="${this._t("delete")}" @click="${() => this._deleteComposant(c)}">
                <ha-icon icon="mdi:trash-can-outline"></ha-icon>
              </button>
            </div>
          `
        }
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Styles
  // ------------------------------------------------------------------
  static get styles() {
    return styles;
  }

}
customElements.define("index-manager-card", IndexManagerCard);

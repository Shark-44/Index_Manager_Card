# Index_Manager_Card
 ![Texte alternatif](/images/capture_1.PNG "Gestion pieces").
  ![Texte alternatif](/images/capture_2.PNG "Gestion entity").
# 🏠 Home Assistant Index Manager

A system to organize Home Assistant entities by rooms and components, with an AppDaemon backend and a custom Lovelace card.

---

## ✨ Features

* Create and manage rooms (pièces)
* Display actuators and receivers
* Custom Lovelace card (LitElement)
* AppDaemon REST API
* Demo automation included
* 🔁 Replace a device without breaking automations (via component abstraction)

---

## 📋 Prerequisites
- Home Assistant
- AppDaemon addon
- HACS (optionnel)


## 🃏 Lovelace Resources
Add in Settings → Dashboard → Resources :
url: /local/index_manager_card.js?v=1
type: module

url: /local/appdaemon_restart_card.js?v=1
type: module

## 🧠 Core Idea

Instead of using raw entities:

light.salon_lamp

You use logical components:

Salon → Lampe

Mapping handled by AppDaemon:

lampe_salon → light.salon_lamp

If you replace the device:

lampe_salon → light.new_lamp

✅ No automation needs to change

---

## 📁 Installation Structure

### AppDaemon (apps)

config/appdaemon/apps/

* api_index.py
* demo_bureau.py
* apps.yaml

---

### AppDaemon config

If you use the AppDaemon addon:

/addon_configs/a0d7b954_appdaemon/appdaemon.yaml

---

### Frontend (custom cards)

config/www/

* index_manager_card.js
* appdaemon_restart_card.js

---

### Home Assistant

config/

* index.yaml

---

## ⚙️ apps.yaml

api_index:
module: api_index
class: ApiIndex

demo_bureau:
module: demo_bureau
class: DemoBureau

---

## 🧪 Demo

The demo_bureau.py script shows how to interact with rooms and components.
video Youtube :
https://youtu.be/B-Guj_zSua0
---

## 🚀 Usage

Add the card in Lovelace:

type: custom:index-manager-card

---

## 🔮 Roadmap

* Component editor
* Entity alias system (in progress)
* Automation builder
* HACS integration

---

## 📜 License

MIT

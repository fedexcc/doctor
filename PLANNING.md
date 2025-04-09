# 🧠 Dogtor – Project Planning Checklist

This file lists all core features and their sub-tasks in progress-tracking format.  
You (or the agent) can mark `[x]` once a task is done. Use this for easy progress tracking and instruction scoping.

---

## 🗂 Feature: Bot Setup & Infrastructure

- [ ] Basic Express server running (`index.js`)
- [ ] Ngrok + nodemon dev script (`dev.js`)
- [ ] `.env` file support for secrets
- [ ] Twilio webhook route created
- [ ] Request validation and basic logging

---

## 📬 Feature: Message Handling & Flow

- [ ] Show greeting + main menu
- [ ] Handle selection by “professional”
- [ ] Handle selection by “specialty”
- [ ] Back to main menu functionality
- [ ] Invalid option fallback message
- [ ] Confirm appointment selection before sending

---

## 📦 Feature: Dynamic Data

- [ ] `data/profesionales.json` created
- [ ] Read list of professionals from file
- [ ] Derive list of specialties dynamically
- [ ] Match selected option to JSON entry
- [ ] Fallback if specialty or professional is not found

---

## 🌐 Feature: External Integration

- [ ] Webhook call to Make or Latenode
- [ ] Format correct payload (user, date, vet)
- [ ] Handle response & confirm to user
- [ ] Add loading/fail-safe if request fails

---

## 🔐 Feature: User Session & Anti-Spam

- [ ] Store simple session per phone number
- [ ] Rate limit responses per user (30s gap)
- [ ] Add “cooldown” feedback if limit exceeded
- [ ] Log abuse attempts for review

---

## 🛠 Feature: Miscellaneous

- [ ] `README.md` completed
- [ ] `LICENSE` added
- [ ] `cursor-agent-context.md` written
- [ ] `estructura-dinamica.md` uploaded
- [ ] Sample `profesionales.json` live in `/data`

---

To mark a task done, replace `[ ]` with `[x]`.  
Cursor can use this file as reference to scope each request:  
> “Work on the remaining tasks from `Message Handling & Flow`.”
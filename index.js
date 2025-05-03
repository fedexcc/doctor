require('dotenv').config();
// Debug: Log loaded env vars (only keys for security)
console.log('Loaded .env variables (keys):', Object.keys(process.env));

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia, List, Buttons } = require('whatsapp-web.js'); // Import necessary components

// --- Load Clinic Configuration ---
let clinicConfig = {};
let profesionales = [];
let especialidades = [];
let clinicName = 'Default Clinic Name';
let appointmentOptions = { duration: 30, interval_between_appointments: 0 }; // Default values

try {
  const configPath = process.env.CLINIC_CONFIG_PATH;
  if (!configPath) {
    throw new Error('CLINIC_CONFIG_PATH not defined in .env');
  }
  const fullConfigPath = path.resolve(__dirname, configPath);
  console.log(`Loading configuration from: ${fullConfigPath}`);
  const rawConfigData = fs.readFileSync(fullConfigPath);
  clinicConfig = JSON.parse(rawConfigData);

  profesionales = clinicConfig.professionals || [];
  especialidades = clinicConfig.specialties || [];
  clinicName = clinicConfig.clinic_name || clinicName;
  appointmentOptions = clinicConfig.appointment_options || appointmentOptions;

  console.log(`Configuration loaded for clinic: ${clinicName}`);
  console.log('Professionals loaded:', profesionales.length);
  console.log('Specialties loaded:', especialidades.length);
  console.log('Appointment options:', appointmentOptions);

} catch (error) {
  console.error('Error loading or parsing clinic configuration:', error);
  process.exit(1);
}

// --- User Session Management (Simple In-Memory) ---
const userSessions = {}; // Key: phoneNumber (e.g., '549341...'), Value: { state: '...', data: {} }

function getUserSession(phoneNumber) {
  if (!userSessions[phoneNumber]) {
    userSessions[phoneNumber] = { state: 'main_menu', data: {} };
  }
  return userSessions[phoneNumber];
}

function updateUserState(phoneNumber, newState, data = {}) {
  const session = getUserSession(phoneNumber);
  session.state = newState;
  session.data = data;
  console.log(`User ${phoneNumber} state updated to: ${newState}`);
}

// --- WhatsApp Client Setup ---
console.log('Initializing WhatsApp client...');
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.resolve(__dirname, process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth/session')
    }),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
        ],
        headless: true,
        timeout: 60000,
    }
});
console.log('Client object created.');

client.on('qr', qr => {
    console.log('QR Code Received, Scan please!');
    qrcode.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('authenticated', () => {
    console.log('Client is authenticated!');
});

client.on('auth_failure', msg => {
    console.error('Authentication failed:', msg);
    process.exit(1); // Exit if authentication fails
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// --- Message Sending Functions (Adapted for whatsapp-web.js) ---

async function sendMainMenu(chatId) {
    console.log(`Sending Main Menu to ${chatId}`);
    // Revert to simple text message for reliability check
    const text = `¡Hola! Soy Dogtor 🐶, tu asistente virtual para ${clinicName}.

¿Qué necesitas hacer?

1. Sacar un Turno 📅
2. Consultar Abono 💳

Escribí el número de la opción.`;

    try {
        await client.sendMessage(chatId, text); // Send simple text
        console.log(`Main Menu (Text) successfully sent to ${chatId}`);
        updateUserState(chatId.split('@')[0], 'main_menu');
    } catch (error) {
        console.error(`ERROR sending main menu text to ${chatId}:`, error);
    }
}

async function sendProfessionalList(chatId) {
    console.log(`Sending Professional List (Text) to ${chatId}`);
    // Revert to simple text message
    let text = `Elegí un profesional:

`;
    profesionales.forEach((p, index) => {
        text += `${index + 1}. ${p.name} (${p.specialties.join(', ')})\n`;
    });
    text += `
Escribí el número del profesional.`;

    try {
        await client.sendMessage(chatId, text);
        console.log(`Professional List (Text) sent successfully to ${chatId}`);
        updateUserState(chatId.split('@')[0], 'awaiting_professional_selection');
    } catch (error) {
        console.error(`Error sending professional list text to ${chatId}:`, error);
    }
}

async function sendSpecialtyList(chatId) {
    console.log(`Sending Specialty List (Text) to ${chatId}`);
    // Revert to simple text message
    let text = `Elegí una especialidad:

`;
    especialidades.forEach((spec, index) => {
        text += `${index + 1}. ${spec}\n`;
    });
    text += `
Escribí el número de la especialidad.`;

    try {
        await client.sendMessage(chatId, text);
        console.log(`Specialty List (Text) sent successfully to ${chatId}`);
        updateUserState(chatId.split('@')[0], 'awaiting_specialty_selection');
    } catch (error) {
        console.error(`Error sending specialty list text to ${chatId}:`, error);
    }
}

async function sendConfirmationPrompt(chatId, selectionText) {
    console.log(`Sending Confirmation Prompt (Text) for "${selectionText}" to ${chatId}`);
    const text = `Seleccionaste: *${selectionText}*. ¿Confirmamos?

1. Sí, confirmar
2. No, cancelar

Escribí el número.`;
    try {
        await client.sendMessage(chatId, text);
        console.log(`Confirmation prompt (Text) sent successfully to ${chatId}`);
        // Keep state awaiting_confirmation
        updateUserState(chatId.split('@')[0], 'awaiting_confirmation', session.data); // Ensure data persists
    } catch (error) {
        console.error(`Error sending confirmation prompt text to ${chatId}:`, error);
    }
}

async function sendTextMessage(chatId, body) {
    console.log(`Sending text "${body}" to ${chatId}`);
    try {
        await client.sendMessage(chatId, body);
    } catch (error) {
        console.error(`Error sending text message to ${chatId}:`, error);
    }
}

// --- Message Handler --- 
client.on('message', async msg => {
    const chatId = msg.from;
    const phoneNumber = chatId.split('@')[0];
    const body = msg.body?.trim();
    // Remove button handling logic for now as we send text
    // const selectedButtonId = msg.selectedButtonId;

    // Ignore status updates or messages from groups
    if (msg.isStatus || msg.from.endsWith('@g.us')) return;

    // Simulate typing
    const chat = await msg.getChat();
    chat.sendStateTyping();

    const delay = Math.floor(Math.random() * (10000 - 4000 + 1)) + 4000;
    await new Promise(resolve => setTimeout(resolve, delay));

    chat.clearState();

    const session = getUserSession(phoneNumber);
    // Adjust log to remove ButtonID
    console.log(`Message received: From=${chatId}, State=${session.state}, Body="${body}"`);

    try {
        // --- Remove List Selection Handling ---
        /*
        const selectedRowId = msg.selectedRowId;
        if (selectedRowId) {
            console.log(`List item selected: ${selectedRowId}`);
            // ... (list handling logic removed)
            return;
        }
        */

        // --- Handle Text Messages ---
        if (!body) return; // Ignore empty messages

        const choice = parseInt(body);

        switch (session.state) {
             case 'main_menu':
                 if (choice === 1) { // Sacar turno
                     await sendAppointmentTypeSelection(chatId);
                 } else if (choice === 2) { // Consultar abono
                     await sendTextMessage(chatId, 'Consultas sobre abonos: Próximamente disponible. Por ahora, podés sacar un turno.');
                     // await sendMainMenu(chatId); 
                 } else {
                     // Respond to anything else by showing menu again
                     await sendMainMenu(chatId);
                 }
                 break;
            case 'awaiting_appointment_type':
                 if (choice === 1) { // By Professional
                     await sendProfessionalList(chatId);
                 } else if (choice === 2) { // By Specialty
                     await sendSpecialtyList(chatId);
                 } else {
                     await sendTextMessage(chatId, 'Opción inválida. Por favor, elegí 1 o 2.');
                     await sendAppointmentTypeSelection(chatId); // Ask again
                 }
                 break;
            // Restore text parsing logic for these states
            case 'awaiting_professional_selection':
                if (!isNaN(choice) && choice > 0 && choice <= profesionales.length) {
                    const selectedProf = profesionales[choice - 1];
                    updateUserState(phoneNumber, 'awaiting_confirmation', { selection: selectedProf, type: 'professional' });
                    await sendConfirmationPrompt(chatId, `${selectedProf.name} (${selectedProf.specialties.join(', ')})`);
                } else {
                    await sendTextMessage(chatId, 'Opción inválida. Por favor, elegí un número de la lista.');
                    await sendProfessionalList(chatId); // Send list again
                }
                break;
            case 'awaiting_specialty_selection':
                 if (!isNaN(choice) && choice > 0 && choice <= especialidades.length) {
                    const selectedSpec = especialidades[choice - 1];
                     updateUserState(phoneNumber, 'awaiting_confirmation', { selection: selectedSpec, type: 'specialty' });
                     await sendConfirmationPrompt(chatId, selectedSpec);
                 } else {
                    await sendTextMessage(chatId, 'Opción inválida. Por favor, elegí un número de la lista.');
                    await sendSpecialtyList(chatId); // Send list again
                 }
                 break;
            case 'awaiting_confirmation':
                if (choice === 1) { // Yes, confirm
                    const selectionData = session.data;
                    const professionalName = selectionData.type === 'professional' ? selectionData.selection.name : 'un profesional disponible';
                    const specialtyName = selectionData.type === 'specialty' ? selectionData.selection : (selectionData.selection.specialties ? selectionData.selection.specialties.join('/') : 'Clínica General');
                    
                    const confirmationText = `¡Perfecto! 👍 Buscaremos un turno para *${specialtyName}* con *${professionalName}*.`;
                    await sendTextMessage(chatId, confirmationText + '\n\n(Próximamente: te mostraremos los horarios disponibles)');
                    updateUserState(phoneNumber, 'main_menu');
                } else if (choice === 2) { // No, cancel
                    await sendTextMessage(chatId, 'Entendido. Selección cancelada.');
                    await sendMainMenu(chatId); // Send menu again
                } else {
                    // Ask again if unexpected number
                     const confirmSelection = session.data.selection;
                     const confirmText = session.data.type === 'professional' ? `${confirmSelection.name} (${confirmSelection.specialties.join(', ')})` : confirmSelection;
                     // We also need to revert sendConfirmationPrompt to send text
                     await sendConfirmationPrompt(chatId, confirmText);
                }
                break;
            default:
                 // If in main_menu and didn't click a button, or unknown state, send menu
                 if (session.state === 'main_menu' || !session.state) {
                     console.log(`Fallback to main menu. Current state: ${session.state}`);
                     await sendMainMenu(chatId);
                 } else {
                     // If in another state and text is received unexpectedly
                     // Maybe offer help or reset?
                     console.log(`Unexpected text input in state: ${session.state}`);
                     await sendTextMessage(chatId, 'No entendí eso. ¿Necesitás ayuda? Escribí *Menu* para volver a empezar.');
                     // Or force main menu?
                     // await sendMainMenu(chatId);
                 }
                 break;
        }
    } catch (error) {
        console.error(`Error processing message from ${chatId}:`, error);
        try {
            await sendTextMessage(chatId, 'Lo siento, ocurrió un error interno. Por favor, intenta de nuevo más tarde.');
        } catch (sendError) {
             console.error(`Failed to send error message to ${chatId}:`, sendError);
        }
        // Optionally reset state on error?
        // updateUserState(phoneNumber, 'main_menu');
    }
});

// --- Start Client ---
console.log('Starting WhatsApp client initialization...');
try {
    client.initialize();
    console.log('client.initialize() called.');
} catch (err) {
    console.error('Error during client.initialize():', err);
    process.exit(1);
}

// --- Graceful Shutdown --- (Optional but recommended)
process.on('SIGINT', async () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nGracefully shutting down from SIGTERM...');
    await client.destroy();
    process.exit(0);
});

// --- Add the new function for appointment type selection ---
async function sendAppointmentTypeSelection(chatId) {
    console.log(`Sending Appointment Type Selection to ${chatId}`);
    const text = `¿Cómo preferís buscar tu turno?

1. Por Profesional 👨‍⚕️
2. Por Especialidad 🩺

Escribí el número de la opción.`;
    try {
        await client.sendMessage(chatId, text);
        updateUserState(chatId.split('@')[0], 'awaiting_appointment_type');
    } catch (error) {
        console.error(`Error sending appointment type selection to ${chatId}:`, error);
    }
} 
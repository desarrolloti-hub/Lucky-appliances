const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

exports.sendNotification = functions.https.onRequest(async (req, res) => {
  // Configurar CORS para TODAS las respuestas, incluyendo OPTIONS
  res.set('Access-Control-Allow-Origin', '*'); // Temporalmente usar * para probar
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder a preflight OPTIONS inmediatamente
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST permitido' });
    return;
  }

  try {
    const { token, title, body } = req.body;
    
    if (!token || !body) {
      res.status(400).json({ error: 'Token y mensaje requeridos' });
      return;
    }

    const message = {
      notification: { 
        title: title || 'Lucky Appliances', 
        body 
      },
      token,
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada:', response);
    
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});
import express from 'express';
import pushNotificationService from './pushNotificationService.js';

const router = express.Router();

/**
 * Send push notification to specific user
 * POST /api/push-notifications/send-to-user
 */
router.post('/send-to-user', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, title, body' 
      });
    }
    
    const result = await pushNotificationService.sendPushNotificationToUser(
      userId, 
      title, 
      body, 
      data
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send push notification to all users
 * POST /api/push-notifications/send-to-all
 */
router.post('/send-to-all', async (req, res) => {
  try {
    const { title, body, userTypeFilter, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, body' 
      });
    }
    
    const result = await pushNotificationService.sendPushNotificationToAllUsers(
      title, 
      body, 
      userTypeFilter || 'all',
      data || {}
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending push notification to all:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send push notification to multiple users
 * POST /api/push-notifications/send-to-multiple
 */
router.post('/send-to-multiple', async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: userIds (array), title, body' 
      });
    }
    
    const result = await pushNotificationService.sendPushNotificationToMultipleUsers(
      userIds, 
      title, 
      body, 
      data
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending push notification to multiple users:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

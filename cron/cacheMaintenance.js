const cron = require('node-cron');
const ImageCache = require('../models/ImageCache');

// Soft limit for the cache
const CACHE_LIMIT = 10000;

async function performCacheMaintenance() {
  try {
    console.log('[CRON] Starting ImageCache maintenance...');
    const totalCount = await ImageCache.countDocuments();
    
    if (totalCount <= CACHE_LIMIT) {
      console.log(`[CRON] Cache size (${totalCount}) is below limit (${CACHE_LIMIT}). No cleanup needed.`);
      return;
    }

    const excessCount = totalCount - CACHE_LIMIT;
    console.log(`[CRON] Cache limit exceeded by ${excessCount} images. Looking for eligible cleanup candidates...`);

    // 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Criteria: Not used in 6 months AND usageCount <= 2
    const query = {
      lastUsed: { $lt: sixMonthsAgo },
      usageCount: { $lte: 2 }
    };

    const eligibleCount = await ImageCache.countDocuments(query);
    if (eligibleCount === 0) {
      console.log('[CRON] No eligible images found for cleanup (none older than 6 months with <= 2 usage). Aborting.');
      return;
    }

    // Determine how many to delete (max is excessCount)
    const deleteLimit = Math.min(excessCount, eligibleCount);
    
    // Sort by oldest lastUsed and lowest usageCount
    const candidatesToDelete = await ImageCache.find(query)
      .sort({ lastUsed: 1, usageCount: 1 })
      .limit(deleteLimit)
      .select('_id imageHash');

    if (candidatesToDelete.length > 0) {
      const idsToDelete = candidatesToDelete.map(c => c._id);
      const result = await ImageCache.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`[CRON] Successfully deleted ${result.deletedCount} unused cached images.`);
    }

  } catch (error) {
    console.error('[CRON ERROR] Error during cache maintenance:', error);
  }
}

// Run daily at 3:00 AM
cron.schedule('0 3 * * *', () => {
  performCacheMaintenance();
});

console.log('[CRON] Cache Maintenance scheduled for 3:00 AM daily.');

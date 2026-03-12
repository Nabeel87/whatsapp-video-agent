/**
 * videoQueue.js
 * In-memory video queue.
 * Stores all video requests and exposes methods to add/query them.
 */

const queue = [];

/**
 * Add a new video request to the queue.
 * @param {Object} request
 */
function addToQueue(request) {
  queue.push(request);
  console.log(`📋 [Queue] New item added. Total: ${queue.length}`);
}

/**
 * Get all video requests from a specific user.
 * @param {string} from - WhatsApp sender ID
 * @returns {Array}
 */
function getUserJobs(from) {
  return queue.filter((r) => r.from === from);
}

/**
 * Get total number of items in the queue.
 * @returns {number}
 */
function getQueueSize() {
  return queue.length;
}

module.exports = { addToQueue, getUserJobs, getQueueSize };

// Initialize replica set if not already configured
// This script runs on container startup

const initReplicaSet = () => {
  try {
    const status = rs.status();
    print('Replica set already initialized');
    return status;
  } catch (e) {
    print('Initializing replica set rs0...');
    rs.initiate({
      _id: 'rs0',
      version: 1,
      members: [{ _id: 0, host: 'localhost:27017' }]
    });
    print('Replica set rs0 initialized successfully');
  }
};

// Only run if this is the primary (initiated by mongod command)
if (db.getMongo().isMaster().ismaster) {
  initReplicaSet();
}

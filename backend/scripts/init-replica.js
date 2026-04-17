// Initialize MongoDB Replica Set for Change Streams
const initReplicaSet = () => {
  try {
    const status = rs.status();
    print("Replica set already initialized");
    printjson(status);
  } catch (e) {
    print("Initializing replica set...");
    rs.initiate({
      _id: "rs0",
      version: 1,
      members: [
        {
          _id: 0,
          host: "mongodb:27017",
          priority: 1
        }
      ]
    });
    print("Replica set initialized successfully");
  }
};

// Wait a bit for MongoDB to be ready
sleep(3000);
initReplicaSet();

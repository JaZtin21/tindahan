try {
    rs.status();
} catch (e) {
    print("No replica set detected. Initializing rs0...");
    rs.initiate({
        _id: 'rs0',
        members: [{ _id: 0, host: '127.0.0.1:27017' }]
    });
    // Wait for the node to transition to PRIMARY before finishing up
    sleep(3000); 
    print("Replica set rs0 initialized successfully!");
}
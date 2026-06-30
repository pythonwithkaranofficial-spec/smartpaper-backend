const mongoose = require("mongoose");
const ImageCache = require("./models/ImageCache");

async function audit() {
  await mongoose.connect("mongodb://pythonwithkaranofficial_db_user:Karan1102001@ac-dwextqx-shard-00-00.2qifzrd.mongodb.net:27017,ac-dwextqx-shard-00-01.2qifzrd.mongodb.net:27017,ac-dwextqx-shard-00-02.2qifzrd.mongodb.net:27017/?ssl=true&replicaSet=atlas-nkwv5d-shard-0&authSource=admin&appName=Cluster0");
  
  const count = await ImageCache.countDocuments();
  console.log("Total Cached Images:", count);
  
  if (count > 0) {
    const latest = await ImageCache.findOne().sort({ createdAt: -1 });
    const oldest = await ImageCache.findOne().sort({ createdAt: 1 });
    console.log("Latest Image:", latest.createdAt, "Prompt:", latest.prompt);
    console.log("Oldest Image:", oldest.createdAt, "Prompt:", oldest.prompt);
    
    const sampleImageSize = latest.imageData ? latest.imageData.length : 0;
    console.log("Sample Image Size (bytes):", sampleImageSize);
  } else {
    console.log("Total Cached Images: 0. Total Size: 0 bytes.");
  }
  
  mongoose.connection.close();
}
audit();

import mongoose from "mongoose";

mongoose.connect(
  process.env.DB_URL,
  {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    retryWrites: false,
  },

  function (err, client) {
    console.log("Connected successfully to mongo server");
  }
);

mongoose.connection.on("error", (err) => {
  console.error(err);
});

mongoose.connection.on("disconnected", function () {
  console.log("disconnected");
});

export default mongoose;

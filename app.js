const express = require('express')
const path = require('path');
const fs = require("fs"); // za kontroliranjem datoteka
const fse = require("fse");
const multer = require("multer"); // simplifies the process of receiving and processing files uploaded by users
const webpush = require("web-push");
const dotenv = require('dotenv'); // .env

const app = express();
app.use(express.json());
dotenv.config();

// For Render deploy
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Baza podataka u obliku json datoteke 
let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';
try {
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);    
}

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// upload audio
const UPLOAD_PATH = path.join(__dirname, "public", "uploads");
var uploadAudio = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_PATH);
    },
    filename: function (req, file, cb) {
      let fn = file.originalname.replaceAll(":", "-");
      cb(null, fn);
    },
  })
}).single("audio");
app.get("/audios", function (req, res) {
  let files = fse.readdirSync(UPLOAD_PATH);
  files = files.reverse().slice(0, 10); // Pretpostavljajući da želiš zadržati limit od 10 najnovijih datoteka
  console.log("In uploads, there are", files);
  res.json({
    files
  });
});
app.post("/saveAudio", function (req, res) {
  uploadAudio(req, res, async function(err) {
      if (err) {
        console.log(err);
        res.json({
          success: false,
          error: {
            message: 'Upload failed: ' + JSON.stringify(err)
          }
        });
      } else {
        console.log(req.body);
        res.json({ success: true, id: req.body.id });
        await sendPushNotifications(req.body.title);
      }
  });
});

// logika za pretplate
const vapidEmail = process.env.VAPID_EMAIL;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
app.post("/saveSubscription", function(req, res) {
  console.log(req.body);
  let sub = req.body.sub;
  subscriptions.push(sub);
  fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
  res.json({
    success: true
  });
});
async function sendPushNotifications(audioTitle) {
  webpush.setVapidDetails('mailto:${vapidEmail}', vapidPublicKey, vapidPrivateKey);
  subscriptions.forEach(async sub => {
      try {
          console.log("Sending notif to", sub);
          await webpush.sendNotification(sub, JSON.stringify({
              title: 'New audio!',
              body: 'Somebody just recorded a new audio: ' + audioTitle,
              redirectUrl: '/index.html'
            }));    
      } catch (error) {
          console.error(error);
      }
  });
}
  
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.send('Error: ' + err.message);
});

// Start the server
if (externalUrl) {
  const hostname = '0.0.0.0'; // ne 127.0.0.1
  app.listen(port, hostname, () => {
      console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`);
  });
}
else {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}


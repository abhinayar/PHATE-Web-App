const port = process.env.PORT || 3000,
  express = require('express'),
  next = require('next'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  session = require('express-session'),
  MemoryStore = require('memorystore')(session),
  path = require('path');

// Dotenv Config
require('dotenv').config()

// Setup NextJS to use express
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const multer = require('multer'),
  uuidv4 = require('uuid/v4');

// Config the Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads')
  },
  filename: (req, file, cb) => {
    const newFileName = `${req.body.uid || 'no-uid-found'}${path.extname(file.originalname)}`
    cb(null, newFileName)
  }
});

// Create instance of Multer
const uploadToFS = multer({ storage });

const aws = require('aws-sdk'),
  multerS3 = require('multer-s3'),
  s3 = new aws.S3(),
  uuid = require('uuid/v4');

const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    cacheControl: 'max-age=31536000',
    metadata: (req, file, cb) => cb(null, Object.assign({}, req.body)),
    key: (req, file, cb) => {
      const newFileName = `${req.body.uid || 'no-uid-found'}${path.extname(file.originalname)}`;
      cb(null, 'uploads/' + newFileName)
    }
  })
})

// Prepare & serve the app
app.prepare().then(() => {
  const server = express()
  server.use(logger('dev'))
  server.use(bodyParser.json())
  server.use(bodyParser.urlencoded({ extended: true, parameterLimit: 10000, limit: '505mb' }));
  server.use(cookieParser('tempSecret'))
  server.use(session({
    cookie: {
      maxAge: 2147483640
    },
    store: new MemoryStore({ checkPeriod: 2147483640 }),
    secret: 'tempSecret',
    saveUninitialized: false,
    resave: false
  }));


  /***
   *
   * Generates the UUID on receipt of the POST request
   * using uuid_v4(), sets it in the session and responds
   * with the UUID to be stored in localStorage on the client.
   *
   ***/
  server.post('gen_uuid', (req, res) => {
    // Generate the UUID
    const uuid = uuid();

    console.log('Generated UUID', uuid, '\nSetting UUID in session:');

    // Set the UUID in session
    req.session.uuid = uuid;
    req.session.save(err => {
      if (err) console.log('Error saving uuid in session: ', err)
      else console.log('Set the UUID in session.')
    })

    // Everything checks out, respond with the UUID
    res.status(200)
  })














  server.post('generat_uuid', (req, res) => {
    const uid = uuid();
    console.log("Generated UUID", uid);
    console.log("Setting it in the session");
    req.session.uid = uid;
    console.log("Set it =>", req.session);
    res.status(200).send(uid);
  })

  server.post('/upload_FS', uploadToFS.single('file'), (req, res) => {
    console.log("FILE UPLOAD REQUEST")

    console.log(req.file);
    console.log(req.body.uid);

    res.status(200).send();
  })

  server.post('/upload_S3', uploadToS3.single('file'), (req, res) => {
    console.log(req)

    res.status(200).send('Successfully uploaded files!')
  })

  server.get('*', (req, res) => {
    handle(req, res).catch(e => {
      console.log(e)
    });
  })

  server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  });
})

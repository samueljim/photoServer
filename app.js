const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const Grid = require('gridfs-stream');
const sharp = require('sharp');
const chalk = require('chalk');
const statusMonitor = require('express-status-monitor')();
const path = require("path");

/**
 * Create Express server.
 */
const app = express();
app.use(compression());
app.use(statusMonitor);
app.set(
  "port",
  process.env.PORT_NUM ||
    process.env.PORT ||
    80
);

const imageDB = 'mongodb://admin:password@ds227199.mlab.com:27199/glass';
/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(imageDB);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

let gfs = null;
mongoose.connection.once('open', () => {
  Grid.mongo = mongoose.mongo;
  gfs = Grid(mongoose.connection.db);
});

app.use(express.static(__dirname + '/homePage'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname+'/index.html'));
});

/**
 * Image routes.
 */
async function getImage(req, res) {
  /** First check if file exists */
  gfs.findOne({ filename: req.params.filename, root: 'images' }, (errors, file) => {
    /** If there's an error or the file don't exist then send a 404 for the request */
    if (errors || !file || file.length === 0) {
      return res.status(404).send('Error on the database looking for that image.');
    }
    /** create read stream of image from the database */
    const readstream = gfs.createReadStream({
      filename: file.filename,
      root: 'images'
    });

    /** set the proper content type */
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.set('Content-Type', file.contentType); // file.contentType to maintain the image file type

    /** if there's an error pulling image blobs from the database then stop */
    readstream.on('error', () => {
      res.status(404);
      res.end();
    });

    /**  if width or height is given then resize to that size */
    let imageCompression = null;
    if (req.query.format) {
      if (req.query.w) {
        if (req.query.h) {
          imageCompression = sharp()
            .resize(parseInt(req.query.w), parseInt(req.query.h)).toFormat(req.query.format);
        } else {
          imageCompression = sharp()
            .resize(parseInt(req.query.w), null).toFormat(req.query.format);
        }
      } else if (req.query.h) {
          imageCompression = sharp()
            .resize(null, parseInt(req.query.h)).toFormat(req.query.format);
        } else {
          imageCompression = sharp().toFormat(req.query.format);
        }
    } else {
    if (req.query.w) {
      if (req.query.h) {
        imageCompression = sharp()
          .resize(parseInt(req.query.w), parseInt(req.query.h));
      } else {
        imageCompression = sharp()
          .resize(parseInt(req.query.w), null);
      }
    } else if (req.query.h) {
        imageCompression = sharp()
          .resize(null, parseInt(req.query.h));
      } else {
        imageCompression = sharp();
      }
    }
    return readstream.pipe(imageCompression).pipe(res);
  });
}

app.get('/image/:filename', (req, res) => {
  getImage(req, res).then({
  }).catch(() => {
    res.status(404);
  });
});

app.get('*', (req, res) => {
  res.status(404);
});

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('\n%s %s mode', chalk.green('✓'), app.get('env'));
  console.log('%s App is running at http://localhost:%d', chalk.green('✓'), app.get('port'));
  console.log(chalk.red('Ⓒ Samuel Henry'));
});

module.exports = app;

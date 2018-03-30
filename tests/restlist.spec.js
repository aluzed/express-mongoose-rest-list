const path = require('path');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const restList = require('../index');

const config = {
  host: 'localhost',
  port: 27017,
  db: 'restlist_tests'
};

describe('Test Rest List', () => {

  // Items model
  let Items = null;
  const backendUrl = 'http://localhost:3000';

  //========
  // Create a model
  before(done => {
    const fixtures = require(path.join(__dirname, 'fixtures', 'items.json'));

    // Connect to DB
    mongoose.connect(`mongodb://${config.host}:${config.port}/${config.db}`).then(() => {
      const ItemSchema = mongoose.Schema({
        label: { type: String },
        description: { type: String },
        ref: { type: String },
        ean13: { type: String },
        enabled: { type: Boolean },
        created: { type: Date, default: Date.now },
        modified: { type: Date, default: Date.now }
      })

      ItemSchema.statics.searchable = () => {
        return [
          'label',
          'description'
        ]
      };

      Items = mongoose.model('Items', ItemSchema);

      Items.remove().then(() => {
        Items.insertMany(fixtures).then(res => {
          expect(res).to.have.property('length').to.equal(3);
          done();
        })
      })
    })
  })

  //========
  // Test simple listing feature
  it('Should start server on port 3000', done => {
    const router = express.Router();

    router.get('/', (req, res) => {
      return res.send(true);
    })

    /**
     * restList parameters
     * 
     * @param {Router} router Express Router object
     * @param {Object} model Mongoose model
     * @param {String} routePath Route path
     * @param {Array} Middlewares Array of middlewares
     * @param {Object} options Query options 
     */

    // Normal list
    restList(router, Items, 'items');

    // List only enabled items
    restList(router, Items, 'items_2', null, { 
      searchParams: {
        enabled: true
      }
    });

    // List only one field
    restList(router, Items, 'items_3', null, {
      defaultFields: {
        label: 1
      }
    });

    // Middleware
    restList(router, Items, 'items_4', [
      (req, res, next) => {
        if(!req.admin) {
          return res.status(403).send('Forbidden');
        }

        return next();
      }
    ]);

    app.use('/', router);

    app.listen(3000, () => {
      // Check if server is really opened
      chai
        .request(backendUrl)
        .get('/')
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        })
    })
  }).timeout(5 * 1000);

  //======
  // Requests 

  // Width ?limit=
  it('Should get a list from request', done => {
    chai
      .request(backendUrl)
      .get('/items?limit=2')
      .end((err, res) => {
        expect(res).to.have.status(200);
        let resContent = JSON.parse(res.text);
        expect(resContent.results).to.have.property('length').to.equal(2);
        done();
      })
  })

  // Width ?filter= 
  it('Should test options default values features', done => {
    chai
      .request(backendUrl)
      .get('/items_2?filter=lorem')
      .end((err, res) => {
        expect(res).to.have.status(200);
        let resContent = JSON.parse(res.text);
        expect(resContent.results).to.have.property('length').to.equal(1);
        done();
      });
  })

  it('Should test options fields limitation features', done => {
    chai
      .request(backendUrl)
      .get('/items_3')
      .end((err, res) => {
        expect(res).to.have.status(200);
        let resContent = JSON.parse(res.text);
        expect(resContent.results).to.have.property('length').to.equal(3);
        done();
      });
  })

  it('Should test middlewares features', done => {
    chai
      .request(backendUrl)
      .get('/items_4')
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  })

})
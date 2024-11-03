const express = require('express') 
const http = require('http')
const fs = require('fs')
var favicon = require('serve-favicon');
var path = require('path');
require('dotenv').config()
const PORT = process.env.PORT

//const flash = require('req-flash');



const app = express()

const routes = require('./public/js/collectionFunctions')
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs'); //use hbs handlebars wrapper

app.use(express.static(__dirname + '/public'))

//middleware
app.use(routes.authenticate); //authenticate user
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));


//routes

app.get('/', routes.packs);

app.get('/collection/', routes.collection)

//should probably be concealed
app.get('/collection/id/?[0-9]*', routes.collection)
app.get('/builder/id/?[0-9]*', routes.builtSquad)

app.get('/users', routes.users)

app.get('/packs/?(gold)|(bronze)|(silver)', routes.specPack)
app.get('/builder', routes.builderChoice)
app.get('/builder/433', routes.builder433)
app.get('/builder/442', routes.builder442)
app.get('/register', routes.register)
app.get('/clear', routes.clear)

//start server
app.listen(PORT, err => {
  if(err) console.log(err)
  else {
    console.log(`Server listening on port: ${PORT}`)
    console.log(`To Test:`)
    console.log(`http://localhost:3000`)
  }
})
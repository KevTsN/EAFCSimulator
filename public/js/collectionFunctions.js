const url = require('url');
const sqlite3 = require('sqlite3').verbose(); //verbose provides more detailed stack trace
const db = new sqlite3.Database('data/database1');
const fs = require('fs')



const API_KEY = process.env.API_KEY
console.log("this is " + API_KEY)
const S_up = 1
const S_down = 186
const A_up = 187
const A_down = 1001
const B_up = 1002
const B_down = 2360
const C_up = 2361
const C_down = 10000
const F_up = 12000
const F_down = 17000

const GoldPrice = 23000
const SilverPrice = 12000
const BronzePrice = 7000
//change prices ngl
let newusers = 1;
    
exports.register = function(request, response){
  newusers += 1;

  let username = `guestUser${newusers}`
  let password = `${newusers}`

   db.run(`insert into users (username, password, role, tokens, idsString) values ('${username}','${password}','guest','100000','')`, function(err){
    //
  })

  response.send(`<script>alert("New User, Password | ${username}, ${password}"); 
  window.location.href = "/"; </script>`)
}

exports.clear = function(request, response){
  newusers = 1;
  //only shows up on users page, so can only be used by admins
  clearCollection();
  response.send(`<script>alert("All collections have been cleared, and any registered guest users have been deleted."); 
  window.location.href = "/"; </script>`)
}

exports.authenticate = async function(request, response, next) {
    /*
      Middleware to do BASIC http 401 authentication
      */
    let auth = request.headers.authorization
    // auth is a base64 representation of (username:password)
    //so we will need to decode the base64
    if (!auth) {
      //note here the setHeader must be before the writeHead
      response.setHeader('WWW-Authenticate', 'Basic realm="need to login"')
      response.writeHead(401, {
        'Content-Type': 'text/html'
      })
      console.log('No authorization found, send 401.')
      response.end();
    } else {
      //console.log("Authorization Header: " + auth)
      //decode authorization header
      // Split on a space, the original auth
      //looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
      var tmp = auth.split(' ')
  
      // create a buffer and tell it the data coming in is base64
      var buf = Buffer.from(tmp[1], 'base64');
  
      // read it back out as a string
      //should look like 'ldnel:secret'
      var plain_auth = buf.toString()
      // console.log("Decoded Authorization ", plain_auth)
  
      //extract the username and password as separate strings
      var credentials = plain_auth.split(':') // split on a ':'
      var username = credentials[0]
      var password = credentials[1]
      // console.log("User: ", username)
      // console.log("Password: ", password)
  

      var authorized = false
      //check database users table for user
      
      db.all("SELECT * FROM users", function(err, rows) {
        
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].username == username & rows[i].password == password) 
          {
            request.username = rows[i].username
            request.password = rows[i].password
            request.user_role = rows[i].role
            request.tokens = rows[i].tokens
            request.idsString = rows[i].idsString
            request.sReward = '0'
            authorized = true}
        }
        if (authorized == false) {
          //we had an authorization header by the user:password is not valid
          response.setHeader('WWW-Authenticate', 'Basic realm="need to login"')
          response.writeHead(401, {
            'Content-Type': 'text/html'
          })
          console.log('No authorization found, send 401.')
          response.end()
        } else
          next()
      })

      if(request.idsString){await setDb(request)}

      
    //notice no call to next()
  
  }
}

  exports.packs = function(request, response){
    let bestC = ''
    db.all('SELECT * FROM cards', function(err, rows){
      jsonrows = rowSort(rows)
      if(jsonrows[0]){
        bestC += `${jsonrows[0].rating} OVR ${jsonrows[0].name}`
        request.bestCard = bestC

      }
      else{
        bestC = 'No cards found'
      }
        
      let count = request.idsString.split(',').length - 1
      request.count = count
      
        let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
        response.render('packs', {username: request.username, tokens: formattedTokens, count: count, bestC: bestC})
    })
    

  }


  function parseURL(request, response) {
    const PARSE_QUERY = true //parseQueryStringIfTrue
    const SLASH_HOST = true //slashDenoteHostIfTrue
    let urlObj = url.parse(request.url, PARSE_QUERY, SLASH_HOST)
    // console.log('path:')
    // console.log(urlObj.path)
    // console.log('query:')
    // console.log(urlObj.query)
    return urlObj
  
  }


  function rowSort(rows){
    let jsonrows = rows.sort((a,b) => {
      if(Number(a.id) < Number(b.id)){
        return -1;
      }
    })

    return jsonrows;
  }
  function Player(id, name, rating, color, mainPos, altPosArr){
    this.id = id;
    this.name = name;
    this.rating = rating;
    this.color = color;
    this.mainPos = mainPos
    this.altPos = altPosArr
  }

exports.collection = async function (request, response){
    sortCollection(request);
    var urlObj = parseURL(request, response);
    var specID = urlObj.path; //expected form: /collection/235
    specID = specID.substring(specID.lastIndexOf("/")+1, specID.length);
    if(specID){
    console.log("Player ID being inspected = " + specID)
    }
    var sql = `SELECT * FROM cards`;

    // let playerOwned = false

    // let playerSpec = null

    db.all(sql, async function(err, rows){
      let playerOwned = false;
      let playerSpec = null;

        for(let i = 0; i < rows.length; i++){
          if(rows[i].id === specID){
            console.log("Player ID matched: "+ rows[i].id)
                playerOwned = true
                let altPositions = rows[i].altPos.split(',')
                playerSpec = new Player(rows[i].id, rows[i].name, rows[i].rating, rows[i].color,
                    rows[i].mainPos, altPositions)
                }
                //doesn't update playerSpec or playerOwned
        }
        let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')

        jsonrows = rowSort(rows)

        playerSpec = JSON.stringify(playerSpec)
        playerSpec = JSON.parse(playerSpec)
        response.render('collection', {playerSpec: playerSpec, players: jsonrows, username: request.username, tokens: formattedTokens});
     });
}

exports.builderChoice = function(request, response){
  let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
    response.render('builderChoice', {username: request.username, tokens: formattedTokens})
}

exports.builder433 = async function(request,response){

  if(request.idsString === ''){
    response.send(`<script>alert("Your collection is completely empty. You can open packs to obtain new players."); 
    window.location.href = "/"; </script>`)
    return;
  }
  var player = await makePlayer(request.idsString.split(',')[0])
  let reee = `${3 * (Math.round(player.rating * 97.6))}`;

  //only auto builder right now
  var sql = 'SELECT * from cards';

  db.all(sql, function(err, rows){

    let players = new Map()
    players.set('LW', 1)
    players.set('RW', 1)
    players.set('ST', 1)
  
    players.set('CM1', 1)
    players.set('CM2', 1)
    players.set('CM3', 1)
  
    players.set('LB', 1)
    players.set('CB1', 1)
    players.set('CB2', 1)
    players.set('RB', 1)
    players.set('GK', 1)
    let ratingTotal = 0;
    rows = rowSort(rows)
    rows = JSON.stringify(rows)
    rows = JSON.parse(rows)
    let missingStr = '';  //html
    let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
   
    for(let pr of rows){
      for(let [key,value] of players){

        if(value !== (1)){continue}

          if(pr.mainPos == key.slice(0, 2)){
            players.set(key, pr)
            break;
          }
          
          //similar position checks
          else if(key.includes('CM') && (/C[A-Z]M/.test(pr.mainPos)) ){
            players.set(key, pr)
            break;
          }

          else if( key.includes('ST') && (/[A-Z]F/.test(pr.mainPos)) ){
            players.set(key, pr)
            break;
          }

          else if(key.includes('RW') && pr.mainPos == ('RM')){
            players.set(key, pr)
            break;
          }

          else if(key.includes('LW') && pr.mainPos == ('LM')){
            players.set(key, pr)
            break;
          }

          else if (key.includes('RB') && pr.mainPos == 'RWB'){
            players.set(key, pr)
            break;
          }

          else if (key.includes('LB') && pr.mainPos == 'LWB'){
            players.set(key, pr)      
            break;
          }



      }
    }
    let atk = null;
    let mid = null;
    let def = null
    let amd = ''

    for(let [key,value] of players){
      if(!atk){
        atk = value
        continue;
      }
      if(atk.rating < value.rating){
        atk = value;
        continue;
      }

      if((/[A-Z]M/.test(value.mainPos))){
      if(!mid){
        mid = value
        continue;
      }
      if(mid.rating < value.rating ){
        mid = value;
        continue;
      }
    }
    if((/[A-Z]K/.test(value.mainPos) || /[A-Z]B/.test(value.mainPos))){
      if(!def){
        def = value
        continue;
      }
      if(def.rating < value.rating){
        def = value;
        continue;
      }
    }


      if(players.get(key) == 1){
        missingStr += `<p> You are missing a player in the ${key} position.</p>` //trip brack
        response.render('builder', {formation: '4-3-3', reward: null, players:null, bestPlayers: null, missingStr: missingStr, 
          username: request.username, bestIDs: null, tokens: formattedTokens})
        return;
      }
    }

    let bestIDs = `${atk.id}&${mid.id}&${def.id}`

    let mm = [atk, mid, def]
    response.render('builder', {formation: '4-3-3', reward: reee, players: players.values(), 
    bestPlayers: mm, bestIDs: bestIDs, missingStr: null, username: request.username, tokens: formattedTokens})
  })
}

exports.builder442 = async function(request,response){
  if(request.idsString === ''){
    response.send(`<script>alert("Your collection is completely empty. You can open packs to obtain new players."); 
    window.location.href = "/"; </script>`)
    return;
  }
  var player = await makePlayer(request.idsString.split(',')[0])
  let reee = `${3 * (Math.round(player.rating * 97.6))}`;

  db.all('SELECT * from cards', function(err, rows){

    let players = new Map()
    players.set('ST1', 1)
    players.set('ST2', 1)

    players.set('LM', 1)
    players.set('CM1', 1)
    players.set('CM2', 1)
    players.set('RM', 1)
  
    players.set('LB', 1)
    players.set('CB1', 1)
    players.set('CB2', 1)
    players.set('RB', 1)
    players.set('GK', 1)
    let ratingTotal = 0;
    rows = rowSort(rows)
    rows = JSON.stringify(rows)
    rows = JSON.parse(rows)
    let missingStr = '';  //html
    let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
   
    for(let pr of rows){
      for(let [key,value] of players){

        if(value !== (1)){continue}

          if(pr.mainPos == key.slice(0, 2)){
            players.set(key, pr)
            break;
          }
          
          //similar position checks
          else if(key.includes('CM') && (/C[A-Z]M/.test(pr.mainPos)) ){
            players.set(key, pr)
            break;
          }

          else if( key.includes('ST') && (/[A-Z]F/.test(pr.mainPos)) ){
            players.set(key, pr)
            break;
          }

          else if(key.includes('RW') && pr.mainPos == ('RM')){
            players.set(key, pr)
            break;
          }

          else if(key.includes('LW') && pr.mainPos == ('LM')){
            players.set(key, pr)
            break;
          }

          else if (key.includes('RB') && pr.mainPos == 'RWB'){
            players.set(key, pr)
            break;
          }

          else if (key.includes('LB') && pr.mainPos == 'LWB'){
            players.set(key, pr)
            break;
          }

      }
    }
    let atk = null;
    let mid = null;
    let def = null
    let amd = ''

    for(let [key,value] of players){
      if(!atk){
        atk = value
        continue;
      }
      if(atk.rating < value.rating){
        atk = value;
        continue;
      }

      if((/[A-Z]M/.test(value.mainPos))){
      if(!mid){
        mid = value
        continue;
      }
      if(mid.rating < value.rating ){
        mid = value;
        continue;
      }
    }
    if((/[A-Z]K/.test(value.mainPos) || /[A-Z]B/.test(value.mainPos))){
      if(!def){
        def = value
        continue;
      }
      if(def.rating < value.rating){
        def = value;
        continue;
      }
    }

        
      if(players.get(key) == 1){
        missingStr += `<p> You are missing a player in the ${key} position.</p>` //trip brack
        response.render('builder', {formation: '4-4-2', reward: null, players:null, bestPlayers: null, missingStr: missingStr, 
          username: request.username, bestIDs: null, tokens: formattedTokens})
        return;
      }
    }

    let bestIDs = `${atk.id}&${mid.id}&${def.id}`

    // request.sReward =  `${(10 * mm)}`
    let mm = [atk, mid, def]
    response.render('builder', {formation: '4-4-2', reward:reee, players: players.values(), 
    bestPlayers: mm, bestIDs: bestIDs, missingStr: null, username: request.username, tokens: formattedTokens})
  })
}


exports.builtSquad = async function(request, response){
  if(request.idsString === ''){
    response.send(`<script>alert("Your collection is completely empty. You can open packs to obtain new players."); 
    window.location.href = "/"; </script>`)
    return;
  }
  var player = await makePlayer(request.idsString.split(',')[0])
  let reee = `${3 * (Math.round(player.rating * 97.6))}`;
  
  request.sReward = reee;

  var urlObj = parseURL(request, response);
  var specID = urlObj.path; //expected form: /collection/235
  specID = specID.substring(specID.lastIndexOf("/")+1, specID.length);

  let idArr = null
  if(specID){
   idArr = specID.split('&')
  }
  else{
    console.log("Something went wrong building your squad.")
    response.redirect('/')
    return;
  }

  console.log(idArr)

  
  //
  db.run(`update users set reward= ${reee} where username='${request.username}'`, function(err){
    //
  })

  console.log(`Reward:  ${request.sReward}, Tokens: ${request.tokens}`)

  db.run(`update users set tokens='${Number(request.tokens) + Number(request.sReward)}' where username='${request.username}'`, function(err){
  })
  db.run(`update users set reward='0' where username='${request.username}'`, function(err){
    //
  })
  console.log("You have earned " + request.sReward + " tokens")
  request.sReward = 0;  

  var urlObj = parseURL(request, response);
  var packType = urlObj.path;
  let packPrice = 0

  packType = packType.substring(packType.lastIndexOf("/")+1, packType.length);

  for(let sd of idArr){
  db.run(`DELETE from cards where id=${sd}`, function(err){
    //
  })
  removeId(request, sd);
  } 
  response.redirect('/')

    return;
}

exports.users = function(request, response){
  if(request.user_role !== 'admin'){
      response.send(`<script>alert("Admin privileges needed to view users."); 
      window.location.href = "/"; </script>`)
      return;
  }

  db.all('select * from users', function(err, rows){
    let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
    response.render('users', {username: request.username, users: rows, tokens: formattedTokens})
  })
}

exports.specPack = async function(request, response){
  var urlObj = parseURL(request, response);
  var packType = urlObj.path;
  let packPrice = 0

  packType = packType.substring(packType.lastIndexOf("/")+1, packType.length);
  if(packType){
    console.log(`(${packType}) pack being opened`)
    switch (packType){
      case 'gold':
        packPrice = GoldPrice
        break;
      case 'silver':
        packPrice = SilverPrice
        break;
        case 'bronze':
          packPrice = BronzePrice
          break;
        default:
          break;
    }
  }
  else{
    return response.redirect('/');
  }


  let results = await openPack(packType, request, response)

  if(typeof results === 'string'){
    response.send(`<img style="width: 50%; height: 50%; margin-auto;" src="images/theFaceBig.jpg"> <script>alert("${results}"); 
    window.location.href = "/"; </script>`)
    return;
  }
  request.tokens = `${parseInt(request.tokens) - packPrice}`

  let sql = `update users set tokens = '${request.tokens}' where username like '${request.username}'`
  db.run(sql, function(err, rows){
    //
    if(err){
      return console.log("Error was encountered.")
    }
  })

    //update cards
    for(let [key, value] of results){
      let altPos = ''
      if(value.altPosArr){
      altPos = value.altPosArr.split(',')}
      db.run(`insert into cards values('${value.name}', '${value.id}', '${value.rating}', '${value.color}', '${value.mainPos}', '${altPos}' )`, function(err){
        //
      })
    }
    let formattedTokens = request.tokens.replace(/(.)(?=(\d{3})+$)/g,'$1,')
  response.render('specificPack', {results: results.values(), username: request.username, tokens: formattedTokens});
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}
//from mozilla developer site

function Player(id, name, rating, color, mainPos, altPosArr){
  this.id = id;
  this.name = name;
  this.rating = rating;
  this.color = color;
  this.mainPos = mainPos
  this.altPos = altPosArr
}


async function makePlayer(id){
  let player = {}

  let url = `https://futdb.app/api/players/${id}`
  return fetch(url, {
      headers: {
          "Content-Type": "application/json",
          "X-AUTH-TOKEN": API_KEY,
          'Accept': 'application/json'}
        })

      .then(response => response.json())
      //check for errors
      .then(result => {
          let pRespond = result.player
          player = new Player(pRespond.id, pRespond.name, pRespond.rating, pRespond.color, pRespond.position, 
              pRespond.positionAlternatives)
          return player
      })

//https://stackoverflow.com/questions/38869197/fetch-set-variable-with-fetch-response-and-return-from-function
//user: nils

}


async function openPack(type, request, response){

  let players = new Map()
  players.set(1,0)
  players.set(2,1)
  players.set(3,2)
  players.set(4,3)
  players.set(5,4)

  let ids = [] //5 ids

  if(type === 'gold')
  {
  ids[0] = getRandomInt(S_up, S_down)//s tier
  ids[1] = getRandomInt(S_up, S_down)//
  ids[2] = getRandomInt(A_up, A_down)//a tier
  ids[3] = getRandomInt(A_up, A_down)
  ids[4] = getRandomInt(B_up, B_down)//b tier
  packPrice = GoldPrice
  }
  else if(type === 'silver'){
      ids[0] = getRandomInt(A_up, A_down)//A tier
      ids[1] = getRandomInt(A_up, A_down)//
      ids[2] = getRandomInt(B_up, B_down)//B tier
      ids[3] = getRandomInt(B_up, B_down)
      ids[4] = getRandomInt(C_up, C_down)//C tier
      packPrice = SilverPrice;
  }
  else if (type === 'bronze'){
      ids[0] = getRandomInt(B_up, B_down)//B tier
      ids[1] = getRandomInt(B_up, B_down)//
      ids[2] = getRandomInt(C_up, C_down)//C tier
      ids[3] = getRandomInt(C_up, C_down)
      ids[4] = getRandomInt(F_up, F_down)//F tier
      packPrice = BronzePrice;

  }
  else{
      return ('Error encountered opening pack. Pack type not specified.')
  }

  //check balance and price
  let balance = parseInt(request.tokens)
  if(balance - packPrice < 0){
      return ('You do not have enough tokens to buy this pack.')
  }

  //respective mw functions handle lowering token balance
  let newIDs = '' //add to idsString
  for(let [key,value] of players){
      players.set(key, await(makePlayer(ids[value])))
  }

  //add ids
  for(let [key,value] of players){
    newIDs += `${value.id},`
}

  
  //let idS = ''
  var sql = `SELECT * from users where username='${request.username}'`
  db.all(sql, function(err, rows){
    //should be one row but w/e
    for(let i of rows){
      request.idsString = i.idsString
    }
  })

  request.idsString += newIDs;
  db.run(`update users set idsString= '${request.idsString}' where username= '${request.username}'`, function(err){
    if(!err){
        console.log("Successfully modified user's card IDs string.")
    }
  })

  sortCollection(request);
return players;

}

async function getPlayers(idString){
  //use id string to get a map of players
  let players = new Map()
  let j = 1
  let col = idString.split(',')
  for(let o of col){
    if(!isNaN(o) && !isNaN(parseFloat(o)) ){
        players.set(j, await(makePlayer(o) ) )
        j++;
    }
  }

  return players
}

async function setDb(request){
  db.run('DELETE from cards', function(err){
    if(err){
      return console.log("error clearing database")
    }
  })

 
  let collection = await getPlayers(request.idsString)
  //fix cards insertion i think

  db.run('CREATE TABLE IF NOT EXISTS "cards" (name text PRIMARY KEY, id text, rating text, color text, mainPos text, altPos text)', function(err){
    //
  })

  for(let [key, value] of collection){
    db.run(`insert into cards (name, id, rating, color, mainPos, altPos) values ('${value.name}', '${value.id}', '${value.rating}', '${value.color}', '${value.mainPos}', '')`, function(err){
      if(err){
        return console.log('Error occured.')
      }
      console.log(this.lastID)
    })
  }

}

function sortCollection(request){
  let col = request.idsString.split(',')

  col = col.sort(function(a, b){
      return a - b}) //w3schools snippet
  let newStr = ''
  newStr.replaceAll(' ', '')

      for(o of col){
        if(!isNaN(o) && !isNaN(parseFloat(o)) ){
            //make sure it's a numeric string
          newStr += `${o},`            
        }
    }
    request.idsString = newStr;
    db.run(`update users set idsString = '${newStr}' where username='${request.username}'`, function(err){
      if(err){
        console.log('Error trying to update user\'s IDs string.')
      }
    })
}

function removeId(request, id){
  let col = request.idsString.split(',')
  let newStr = ''

    for(o of col){
      if(!isNaN(o) && !isNaN(parseFloat(o)) ){
          if(o !== id){
            newStr += `${o},`  
          }
                  
        }
    }
    request.idsString = newStr;
    db.run(`update users set idsString = '${newStr}' where username='${request.username}'`, function(err){
      if(err){
        console.log('Error trying to update user\'s IDs string.')
      }
    })


  }

  function clearCollection(request, id){
    
    db.run(`DELETE from cards`, function(err){
      if(err){
        console.log('Error trying to clear collection.')
      }
    })


    db.run(`DELETE from users where username like 'guestUser%'`, function(err){
      if(err){
        console.log('Error trying to clear collection.')
      }
    })

    db.run(`update users set tokens = '100000' where username like 'newUser'`, function(err){
      //
    })

    db.run(`update users set idsString = ''`, function(err){
      //
    })

  }
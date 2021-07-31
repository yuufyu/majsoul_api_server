// -----------------------------------------------------------------------------------
//  Majsoul API Server
// -----------------------------------------------------------------------------------
'use strict';

const MjSoul = require('mjsoul');
const Koa = require('koa');
const Router = require('@koa/router');
const EventEmitter = require('events');

const config = require('./config.js');
const mjsoul = new MjSoul(config.mjsoul);
const condvar = new EventEmitter();

const port = config.port || 8080;
const addr = config.addr || '127.0.0.1';

const NOT_IMPLEMENTED_ERROR = {error: 'Not implemented.'};

let is_logged_in = false;

function usage(){
    return `<h1>Majsoul API</h1><div>
    <pre><code>GET /record?game_uuid={game_uuid}</code></pre>
    <pre><code>GET /contest?contest_id={contest_id}</code></pre>
    </div>`;
}

async function login() {
    try {
        const resOauth2Login = await mjsoul.sendAsync('oauth2Login', config.login );
        console.log('login : ', resOauth2Login);
        is_logged_in = true;

        condvar.emit('logged_in');
    }catch(err){
        console.error(err.stack || err.message || err);
        process.exit(1);
    }
}

async function fetchCustomizedContestByContestId(contest_id){
    const contest = await mjsoul.sendAsync('fetchCustomizedContestByContestId', {
        contest_id : contest_id
    });
    return contest;
}

async function fetchCustomizedContestGameRecords(unique_id, last_index){
    let params = {
        unique_id : unique_id
    };
    if(last_index){
        params.last_index = last_index;
    }
    const records = await mjsoul.sendAsync('fetchCustomizedContestGameRecords', params );
    return records;
}

async function fetchGameRecord(game_uuid){
    const record = await mjsoul.sendAsync('fetchGameRecord', {game_uuid: game_uuid} );
    const detailRecords = mjsoul.wrapper.decode(record.data);
    const resGameRecord = mjsoul.root.lookupType(detailRecords.name.substring(4)).decode(detailRecords.data);
    const log = resGameRecord.records.map(value => {
        const raw = mjsoul.wrapper.decode(value);
        return {
            'name' : raw.name.substr(4),
            'data' : mjsoul.root.lookupType(raw.name).decode(raw.data)
        };
    });
    return log;
}

(async () => {
    console.log('--- Start App ---');
    mjsoul.on('NotifyAccountLogout', login);
    mjsoul.open(login);

    while(!is_logged_in) {
        await new Promise(resolve => condvar.once('logged_in',resolve));
    }

    const app = new Koa();
    const router = new Router();

    router
        .get('/', (ctx) => {
            ctx.body = usage();
        })
        .get('/contests', async (ctx) => {
            const contest_id = ctx.query.contest_id;
            if(contest_id){
                ctx.body = await fetchCustomizedContestByContestId(contest_id)
            }else{
                ctx.body = NOT_IMPLEMENTED_ERROR;
            }
        })
        .get('/contests/:unique_id', async (ctx) => {
            const unique_id = ctx.params.unique_id;
            ctx.body = NOT_IMPLEMENTED_ERROR;
        })
        .get('/contests/:unique_id/records', async (ctx) => {
            ctx.body = await fetchCustomizedContestGameRecords(ctx.params.unique_id, ctx.query.last_index);
        })
        .get('/records/:game_uuid', async (ctx) => {
            const game_uuid = ctx.params.game_uuid;
            if(!game_uuid){
                ctx.status = 400;
                ctx.body = { error : 'missing param `game_uuid`'};
                return;
            }
            ctx.body = await fetchGameRecord(game_uuid);
            ctx.set('Cache-Control', 'public, max-age=' + 30*24*60*60);
        });

    app.use(router.routes());

    app.listen(port, addr, (err) => {
        if(err){
            throw err;
        }
        console.log('Serving on http://' + addr + ':' + port);
    });

})().catch(err => {
    console.error('error occured');
    console.error(err.stack || err.message || err);
    process.exit(1);
});


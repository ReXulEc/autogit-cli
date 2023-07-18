#! /usr/bin/env node
const yargs = require("yargs");
const fs = require("fs");
const Table = require('cli-table3');
require('dotenv').config()
const ngrok = require('ngrok');
const fastify = require('fastify')();
const { createLog } = require('../util/createLog.js');
const { pull } = require('../util/pull.js');
const { handleSignature } = require('../util/verifySignature.js');
const PORT = +process.env.PORT || 3000;
let startTime = process.hrtime();

yargs
    .command({
        command: 'list',
        describe: "",
        aliases: 'l',
        handler: function (argv) {

            const table = new Table({
                head: ['ID', 'Name', 'Branch', 'Scripts', 'Path'], // Table headers
                colWidths: [5, 20, 20, 'fluid', 'fluid'], // Set the widths of each column (optional)
                style: {
                    head: ['cyan'], // Header text color
                    border: ['gray'], // Border color
                    //space between cell
                },
                chars: { 'mid': ' ', 'mid-mid': '│', 'left-mid': '│', 'right-mid': '│' }
            });
            fs.readFile(__dirname + "\\config.json", 'utf8', (err, content) => {
                if (err) {
                    createLog('ERROR', err.message, true);
                }
                let config = JSON.parse(content);
                Object.entries(config.listen).forEach(async ([key, repo]) => {
                    //key, git, branch, scripts, path
                    table.push([key, repo.git, repo.branch, repo.script.join('\n'), repo.path])

                })
                console.log(table.toString());
            })

        }
    })
    .command({
        command: 'run',
        describe: "",
        aliases: 'r',
        handler: function (argv) {
            fs.readFile(__dirname + "\\config.json", 'utf8', (err, content) => {
                if (err) {
                    //checkEnv(err, false);
                    console.log(err)
                }
                let config = JSON.parse(content);
                fastify.post('/webhook', async (request, reply) => {
                    if (handleSignature(request, config.token) === false) {
                        createLog('ERROR', 'Invalid signature', true);
                        return reply.code(401).send({ received: false, error: 'Invalid signature.' });
                    }

                    config.listen.forEach(async (repo) => {
                        if (repo.git === request.body.repository.full_name) {
                            const branchCheck = () => {
                                if (request.body.ref.replace('refs/heads/', '') === repo.branch) {
                                    return { success: true, branch: request.body.ref.replace('refs/heads/', '') };
                                } else {
                                    return false;
                                }
                            }

                            if (request.body?.commits) {
                                if (branchCheck().success === true) {
                                    createLog(repo.git + ' | WEBHOOK', 'Received push event to ' + branchCheck().branch + ' branch');
                                    await pull(repo.path, repo.git, repo.script);
                                };
                                reply.send({ received: true });
                            }
                        }
                    });
                });

                fastify.listen(
                    {
                        port: PORT,
                        host: '0.0.0.0',
                    },
                    (err) => {
                        if (err) {
                            createLog('ERROR', err.message);
                        } else {
                            createLog('SERVER', `Server is running on port ${PORT}`);
                            createLog('SERVER', `Server started in ${(process.hrtime(startTime)[0] * 1000 + process.hrtime(startTime)[1] / 1000000).toFixed(3)}ms`);
                        }
                    },
                )
            })
        }
    })
    .command({
        command: 'add [git] [branch] [script]',
        describe: "",
        aliases: 'a',
        builder: {
            git: {
                describe: 'aynn',
                demandOption: true,
                type: 'string',
                usage: 'Usage: $0 <command> [options]',
            },
            branch: {
                describe: 'aynn',
                demandOption: true,
                type: 'string'
            },
            script: {
                describe: 'aynn',
                demandOption: true,
                type: 'object'
            },
        },
        handler: function (argv) {
            //fs write
            const yeniVeri = {
                git: argv.git,
                path: process.cwd(),
                branch: argv.branch,
                script: argv.script
            };

            let dosyaYolu = __dirname + "\\config.json";
            console.log(dosyaYolu);

            try {
                let mevcutVeriler = [];
                if (fs.existsSync(dosyaYolu)) {
                    const dosyaIcerigi = fs.readFileSync(dosyaYolu, 'utf8');
                    mevcutVeriler = JSON.parse(dosyaIcerigi);
                }

                mevcutVeriler.push(yeniVeri);

                fs.writeFileSync(dosyaYolu, JSON.stringify(mevcutVeriler, null, 2));
                console.log('Veri başarıyla JSON dosyasına eklendi.');
            } catch (hata) {
                console.error('Dosya işlemleri hatası:', hata);
            }
        }
    })
    .command({
        command: 'delete <ID>',
        describe: "",
        aliases: 'a',
        handler: function (argv) {
            //fs write

            let jsonFilePath = __dirname + "\\config.json";

            // Read the JSON file
            fs.readFile(jsonFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading JSON file:', err);
                    return;
                }

                try {
                    // Parse the JSON data
                    const json = JSON.parse(data);

                    // Specify the index of the object you want to delete from the "listen" array
                    const indexToDelete = argv.ID; // Replace with the desired index to delete

                    // Delete the object from the "listen" array at the specified index
                    json.listen.splice(indexToDelete, 1);

                    // Convert the JSON object back to a string
                    const updatedJson = JSON.stringify(json, null, 2);

                    // Write the updated JSON back to the file
                    fs.writeFile(jsonFilePath, updatedJson, 'utf8', err => {
                        if (err) {
                            console.error('Error writing JSON file:', err);
                            return;
                        }
                        console.log('JSON file updated successfully.');
                    });
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            });



        }
    })
    .command({
        command: 'delete <ID>',
        describe: "",
        aliases: 'a',
        handler: function (argv) {
            //fs write

            let jsonFilePath = __dirname + "\\config.json";

            // Read the JSON file
            fs.readFile(jsonFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading JSON file:', err);
                    return;
                }

                try {
                    // Parse the JSON data
                    const json = JSON.parse(data);

                    // Specify the index of the object you want to delete from the "listen" array
                    const indexToDelete = argv.ID; // Replace with the desired index to delete

                    // Delete the object from the "listen" array at the specified index
                    json.listen.splice(indexToDelete, 1);

                    // Convert the JSON object back to a string
                    const updatedJson = JSON.stringify(json, null, 2);

                    // Write the updated JSON back to the file
                    fs.writeFile(jsonFilePath, updatedJson, 'utf8', err => {
                        if (err) {
                            console.error('Error writing JSON file:', err);
                            return;
                        }
                        console.log('JSON file updated successfully.');
                    });
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            });



        }
    })
    .demandCommand()
    .help()
    .argv

/*

yargs.command(['start [app]', 'run', 'up'], 'Start up an app', {}, (argv) => {
    console.log('starting up the', argv.app || 'default', 'app')
  })
  .command({
    command: 'configure <key> [value]',
    aliases: ['config', 'cfg'],
    desc: 'Set a config variable',
    builder: (yargs) => yargs.default('value', 'true'),
    handler: (argv) => {
      console.log(`setting ${argv.key} to ${argv.value}`)
    }
  })
*/
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const cdvFileErrors = [
  '',
  'NOT_FOUND_ERR',
  'SECURITY_ERR',
  'ABORT_ERR',
  'NOT_READABLE_ERR',
  'ENCODING_ERR',
  'NO_MODIFICATION_ALLOWED_ERR',
  'INVALID_STATE_ERR',
  'SYNTAX_ERR',
  'INVALID_MODIFICATION_ERR',
  'QUOTA_EXCEEDED_ERR',
  'TYPE_MISMATCH_ERR',
  'PATH_EXISTS_ERR'
];

const cdvFileTransferErrors = [
  '',
  'FILE_NOT_FOUND_ERR',
  'INVALID_URL_ERR',
  'CONNECTION_ERR',
  'ABORT_ERR',
  'NOT_MODIFIED_ERR',
];

function createDirRecursive(fsRoot, path) {
  return new Promise((resolve, reject) => {
    fsRoot.getDirectory(path, {create: true}, resolve, err => {
      if (err.code != 12) {
        reject(`Create dir "${path}" error: ${cdvFileErrors[err.code]}`);
        return;
      }
      createDirRecursive(fsRoot, path.substring(0, path.lastIndexOf('/')))
        .then(() => createDirRecursive(fsRoot, path))
        .then(resolve)
        .catch(reject);
      });
  });
}

var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');

        function cdvPromise(cdvFunc) {
          return function () {
            return new Promise((resolve, reject) => {
              cdvFunc(...arguments, resolve, reject);
            })
          }
        }

        console.log('cordova.file', cordova.file);
        cdvPromise(resolveLocalFileSystemURL)(cordova.file.dataDirectory)
          .then(dataDir => {
              console.log('dataDirURL', dataDir.toURL());

              const dirReader = dataDir.createReader();
              dirReader.readEntries(entries => console.log('Dir entries', entries), err => console.error(err));

              createDirRecursive(dataDir, 'recursive/dir/test')
                .then(rDir => {
                    console.log('Recursive dir', rDir);
                    const fileTransfer = new window.FileTransfer();
                    const url = 'https://raw.githubusercontent.com/zorn-v/cordova-electron-file-test/master/www/img/logo.png';
                    fileTransfer.download(url, dataDir.toURL() + 'recursive/dir/test/logo.png',
                        () => {
                            console.log(`Download "${url}" success`);
                            dataDir.getDirectory('recursive', {}, rmDir => {
                                rmDir.removeRecursively(() => console.log('Recursive dir removed'), err => console.error(err));
                            });
                        },
                        err => console.error(`Download "${url}" error: ${cdvFileTransferErrors[err.code]}`)
                    );
                })

                return cdvPromise(dataDir.getDirectory.bind(dataDir))('test', {create: true})
          })
          .then(dir => cdvPromise(dir.getFile.bind(dir))('file.txt', {create: true}))
          .then(entry => {
              console.log('file.txt entry', entry);

              entry.createWriter(function (fileWriter) {
                  console.log(fileWriter);
                  fileWriter.onwriteend = function (evt) {
                      if (!evt.target.error) {
                          console.log('Write SUCCESS', evt);
                          entry.copyTo(dir, 'file-copy.txt', newFile => {
                              console.log('File copied', newFile);
                              entry.moveTo(dir, 'file-move.txt',
                                  movedFile => console.log('File moved', movedFile),
                                  err => console.error(err)
                              );
                          }, err => console.error(err));
                      } else {
                          console.error(evt);
                      }
                  };
                  fileWriter.onerror = function (err) {
                      console.error('fileWriter err', err);
                  };
                  fileWriter.write('TEST');
              }, err => console.error(err));
          })
          .catch(err => console.error(err))
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();

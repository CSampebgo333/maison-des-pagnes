import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement,version as reactVersion} from 'react';
import {version as rendererVersion} from 'react-dom';
import {renderToString} from 'react-dom/server';

test('React and its renderer have matching installed versions and can render together',()=>{
 assert.equal(reactVersion,rendererVersion,'Update react and react-dom together to the exact same version.');
 assert.equal(renderToString(createElement('button',{type:'button'},'Faso Dan Fani')),'<button type="button">Faso Dan Fani</button>');
});

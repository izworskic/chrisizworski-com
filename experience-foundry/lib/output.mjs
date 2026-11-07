import fs from 'node:fs/promises';
import path from 'node:path';

/** Lexical containment AND symlink checks before creating review-only artifacts. */
export async function restrictedOutput(root, input, folder) {
  const base=path.resolve(root,folder), target=path.resolve(root,input);
  if(target===base || !target.startsWith(base+path.sep)) throw Error('Output must be inside '+folder+'/ (preview only).');
  let current=root;
  for(const segment of path.relative(root,target).split(path.sep)) {
    current=path.join(current,segment);
    try {
      const stat=await fs.lstat(current);
      if(stat.isSymbolicLink()) throw Error('Output must not traverse a symbolic link: '+path.relative(root,current));
    } catch(e) { if(e.code!=='ENOENT') throw e; }
  }
  return target;
}

export async function writePacket(target, files) {
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.mkdir(target); // Fail on existing output; never overwrite an earlier review.
  for(const [name,content] of Object.entries(files)) await fs.writeFile(path.join(target,name),content,{flag:'wx'});
}

(function(root){'use strict';
// The same opaque, merged pixel masses used by pixel-hero. Each call creates
// one draw call for one articulated part, independent of its pixel count.
function create({THREE:T,scene}){
 const rootNode=new T.Group();scene.add(rootNode);
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});
 const geometries=[],unit=new T.BoxGeometry(1,1,1),palette=new Map();let disposed=false;
 const p=unit.attributes.position,n=unit.attributes.normal,index=unit.index;
 function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function blocks(parent,boxes){
  const positions=[],normals=[],colors=[],indices=[];
  for(const [x,y,z,w,h,d,hex] of boxes){
   let color=palette.get(hex);if(!color){color=new T.Color(hex);palette.set(hex,color);}
   const offset=positions.length/3;
   for(let i=0;i<p.count;i++){
    const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i),shade=ny<-.5?.82:nz<-.5?.94:1;
    positions.push(x+p.getX(i)*w,y+p.getY(i)*h,z+p.getZ(i)*d);normals.push(nx,ny,nz);
    colors.push(color.r*shade,color.g*shade,color.b*shade);
   }
   for(let i=0;i<index.count;i++)indices.push(offset+index.getX(i));
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeBoundingSphere();geometries.push(geometry);
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function dispose(){if(disposed)return;disposed=true;rootNode.removeFromParent();for(const geometry of geometries)geometry.dispose();unit.dispose();material.dispose();palette.clear();}
 return{root:rootNode,material,group,blocks,dispose};
}
root.HatEnemyRigKit={create};
})(window);

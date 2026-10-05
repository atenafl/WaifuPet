'use strict';
(() => {
  const forms = [
    { id: 'child', label: 'Niños · Naruto / Sasuke', names: ['Naruto niño', 'Sasuke niño'], colors: ['#53caff', '#8d92ff'], height: 210 },
    { id: 'red-mark', label: 'Chakra rojo / Marca maldita I', names: ['Chakra rojo', 'Marca maldita I'], colors: ['#ff5158', '#ac71f4'], height: 210 },
    { id: 'tail-curse', label: 'Una cola / Marca maldita II', names: ['Una cola', 'Marca maldita II'], colors: ['#ff384b', '#8666db'], height: 225 },
    { id: 'shippuden', label: 'Shippuden · Naruto / Sasuke', names: ['Naruto Shippuden', 'Sasuke Shippuden'], colors: ['#54d9ff', '#9880ff'], height: 250 },
    { id: 'sage-mangekyo', label: 'Modo sabio / Mangekyō', names: ['Modo sabio', 'Mangekyō Sharingan'], colors: ['#ffa455', '#ad6cff'], height: 250 },
    { id: 'kurama-eternal', label: 'Modo Kurama / Mangekyō eterno', names: ['Modo Kurama', 'Mangekyō eterno'], colors: ['#ffdc67', '#b264ff'], height: 255 },
    { id: 'sixpaths-rinnegan', label: 'Seis Caminos / Rinnegan', names: ['Seis Caminos', 'Rinnegan'], colors: ['#fff19b', '#bf87ff'], height: 255 }
  ];
  const characters = ['naruto', 'sasuke'];
  const get = id => forms.find(f => f.id === id) || forms[0];
  const next = id => forms[Math.min(forms.length - 1, forms.indexOf(get(id)) + 1)].id;
  const groups = ['motion', 'melee', 'chakra', 'ranged'];
  const progress = (age, duration) => Math.min(3, Math.floor(Math.max(0, age || 0) / duration * 4));
  const frame = actor => {
    const pose = actor.pose === 'recover' && ['jutsu', 'throw', 'seal', 'breath', 'eye', 'swap'].includes(actor.recoveryPose) ? actor.recoveryPose : actor.pose;
    const age = actor.pose === 'recover' ? 1 : actor.poseAge || 0;
    let group = 'motion', sequence = 1, column = actor.pose === 'guard' ? 0 : progress(age, .45);
    if (actor.avatar) {
      const row = (actor.avatar === 'susanoo' ? 2 : 0) + (pose === 'avatar-strike' ? 1 : 0);
      return { atlas: 'ninja-avatars', row, column: progress(age, pose === 'avatar-strike' ? .8 : .85) };
    }
    if(pose==='eye'||pose==='swap'||pose==='charge'&&actor.attack==='kyubi'||pose==='seal'&&actor.attack==='rasenshuriken'&&['kurama-eternal','sixpaths-rinnegan'].includes(actor.form)) {
      const row=actor.character==='sasuke'?(pose==='swap'?3:2):(pose==='seal'?1:0);
      return {atlas:'ninja-techniques',row,column:progress(age,.85)};
    }
    if (['run', 'jump'].includes(pose)) { sequence = 0; column = Math.floor((actor.time || 0) * 10) % 4; }
    else if (['windup', 'punch', 'kick', 'low-kick', 'recover'].includes(pose)) {
      group = 'melee'; sequence = actor.action === 'low-kick' || pose === 'low-kick' || pose === 'kick' ? 1 : 0;
      column = pose === 'windup' ? progress(age, .34) < 2 ? 0 : 1 : pose === 'recover' ? 3 : 2;
    } else if (['charge', 'transform', 'jutsu'].includes(pose)) {
      group = 'chakra'; sequence = pose === 'jutsu' ? 1 : 0; column = progress(age, pose === 'jutsu' ? .8 : .9);
      if(pose==='charge'&&actor.attack==='susanoo'){group='motion';sequence=1;column=progress(age,.85);}
    } else if (['throw', 'seal', 'breath', 'eye', 'swap'].includes(pose)) {
      group = 'ranged'; sequence = pose === 'throw' ? 0 : 1; column = progress(age, .8);
    }
    const index = (actor.character === 'sasuke' ? 8 : 0) + sequence * 4 + column;
    return { atlas: 'ninja-' + get(actor.form).id + '-' + group, row: Math.floor(index / 4), column };
  };
  const slot = pose => pose === 'punch' ? 3 : pose === 'kick' || pose === 'low-kick' ? 4 : pose === 'charge' || pose === 'transform' ? 6 : pose === 'jutsu' ? 7 : pose === 'run' || pose === 'jump' ? 1 : pose === 'dodge' || pose === 'recoil' ? 5 : 0;
  const skills = (character, form) => {
    const level = forms.indexOf(get(form));
    const result = ['punch', 'low-kick', 'shuriken', character === 'naruto' ? 'rasengan' : 'chidori'];
    if (character === 'naruto') {
      if (level >= 3) result.push('rasenshuriken');
      if (level >= 5) result.push('kyubi');
    } else {
      result.push('katon');
      if (level >= 4) result.push('amaterasu', 'susanoo');
      if (level >= 6) result.push('amenotejikara');
    }
    return result;
  };
  const attack = (character, form, turn) => {
    const advanced = forms.indexOf(get(form)) >= 3;
    return character === 'naruto' ? advanced && turn % 3 === 2 ? 'rasenshuriken' : 'rasengan' :
      turn % 3 === 2 ? 'katon' : 'chidori';
  };
  const catalog = { forms, characters, groups, get, next, frame, slot, attack, skills };
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  else window.Ninjas = catalog;
})();

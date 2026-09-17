import PDFDocument from 'pdfkit';
import {createWriteStream} from 'node:fs';
import {resolve} from 'node:path';
import {finished} from 'node:stream/promises';

const dir=resolve(process.argv[2]??'../infiMatch-front-end/public/aide/discord');
const output=resolve(dir,'retrouver-identifiant-discord.pdf');
const doc=new PDFDocument({size:'A4',margins:{top:44,left:44,right:44,bottom:20},autoFirstPage:false,info:{Title:'Associer Discord à InfiMatch — guide illustré',Author:'InfiMatch',Subject:'Retrouver son identifiant utilisateur Discord et activer les notifications'}});
const stream=createWriteStream(output);doc.pipe(stream);
const navy='#092643',blue='#1260dd',muted='#48617b';
function text(value,x,y,size=11,width=507,color=navy){doc.font('Helvetica').fontSize(size).fillColor(color).text(value,x,y,{width,lineGap:3});}
function header(page,title,subtitle){doc.addPage();doc.rect(0,0,595,8).fill(blue);text('INFIMATCH  /  AIDE UTILISATEUR',44,31,10,507,blue);doc.font('Helvetica-Bold').fontSize(25).fillColor(navy).text(title,44,62,{width:507});text(subtitle,44,105,11,507,muted);doc.moveTo(44,786).lineTo(551,786).strokeColor('#dce5ef').stroke();text('Guide ordinateur · Captures Discord du 17 septembre 2026',44,800,8,450,muted);text(page+' / 2',514,800,8,40,muted);}
function step(n,title,y){doc.circle(57,y+10,13).fill(blue);doc.font('Helvetica-Bold').fontSize(12).fillColor('white').text(String(n),52,y+4,{width:15});doc.font('Helvetica-Bold').fontSize(15).fillColor(navy).text(title,80,y,{width:470});}
function shot(file,x,y,width){doc.image(resolve(dir,file),x,y,{width});}

header(1,'Retrouver mon identifiant Discord','Un identifiant utilisateur est un nombre de 17 à 20 chiffres. Ce n’est pas votre pseudo.');
step(1,'Ouvrir les paramètres Discord',157);
text('Sur ordinateur, cliquez sur la roue dentée en bas à gauche, à côté de votre profil.',80,184,11,470);
shot('01-parametres.png',80,224,355);
text('Le profil personnel est masqué dans cette capture.',80,286,8,470,muted);
step(2,'Activer le mode développeur',324);
text('Dans les paramètres, ouvrez Développeur, puis activez Mode développeur. Selon votre version, ce réglage se trouve dans Avancés.',80,351,11,470);
shot('02-menu-developpeur.png',80,400,155);
shot('03-mode-developpeur.png',80,446,470);
step(3,'Copier votre identifiant utilisateur',520);
text('Fermez les paramètres. Cliquez sur votre avatar ou votre nom en bas à gauche. Dans le panneau du profil, choisissez Copier l’identifiant de l’utilisateur.',80,547,11,470);
shot('04-copier-identifiant.png',80,607,360);
text('Autre accès possible : clic droit sur votre nom dans un message ou dans la liste des membres, puis Copier l’identifiant utilisateur.',80,667,10,470,muted);
text('Ne copiez pas le nom d’utilisateur, ni l’identifiant du serveur, du salon ou du bot.',80,719,11,470,blue);

header(2,'Associer Discord à InfiMatch','Avant de demander le code : dans Notifications, cliquez sur Rejoindre le serveur InfiMatch et autorisez les messages privés de ses membres.');
step(4,'Coller le nombre dans InfiMatch',157);
text('Ouvrez Notifications, puis Notifications Discord. Collez le nombre dans Votre identifiant utilisateur Discord et cliquez sur Recevoir mon code privé.',80,184,11,470);
doc.image(resolve(dir,'05-formulaire-infimatch.png'),44,244,{fit:[507,212],align:'center'});
text('Capture de démonstration : le nombre affiché est fictif. Utilisez votre propre identifiant.',44,474,9,507,muted);
step(5,'Confirmer puis choisir les notifications',514);
text('Dans Discord, ouvrez le message privé du bot InfiMatch. Recopiez le code à six chiffres dans Code reçu sur Discord, puis cliquez sur Associer mon compte. Le code est valable 10 minutes.',80,541,11,470);
text('Activez ensuite Recevoir les notifications Discord, choisissez les événements souhaités et enregistrez vos préférences.',80,610,11,470);
doc.roundedRect(44,665,507,98,8).fill('#edf4fc');
doc.font('Helvetica-Bold').fontSize(12).fillColor(navy).text('Vous ne recevez pas le code ?',59,679,{width:475});
text('Rejoignez le serveur où se trouve le bot InfiMatch et autorisez les messages privés de ses membres. Vérifiez aussi que vous avez copié votre propre identifiant. Vos notifications restent disponibles dans InfiMatch.',59,701,10,475);
doc.end();await finished(stream);console.log(JSON.stringify({output,pages:2}));

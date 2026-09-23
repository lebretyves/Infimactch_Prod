import {Link,useSearchParams} from 'react-router';
import {useAuth} from '@/context/AuthContext';
import {api} from '@/services/api';
import {HelpGuides} from '@/components/HelpGuides';
import {SupportTickets,type SupportRequest} from '@/components/SupportTickets';
import {usePageTitle} from '@/lib/usePageTitle';
import {EcranPublic} from '@/layouts/EcranPublic';
import {Logo} from '@/ui/Logo';
import {Icon} from '@/ui/Icon';
import m from './Mentions.module.css';
const request:SupportRequest=(path,body)=>api('/me'+path,body===undefined?undefined:{method:'POST',body});
export default function Aide(){const {user}=useAuth();const [params]=useSearchParams();usePageTitle('Aide et support');return <EcranPublic entete={<><Link to={user?'/accueil':'/'} aria-label="InfiMatch, accueil"><Logo size={38} withWordmark /></Link><Link to={user?'/accueil':'/connexion'} className={m.retour}><Icon name="arrow-left" size={20} />{user?'Retour à mon espace':'Retour à la connexion'}</Link></>}><main id="contenu" tabIndex={-1} style={{width:'100%',maxWidth:1000,margin:'0 auto',padding:'32px clamp(16px,4vw,48px)',overflowWrap:'anywhere',display:'grid',gap:24}}><h1>Centre d’aide</h1><HelpGuides key={user?.role||'public'} initialRole={user?.role==='interimaire'?'NURSE':user?.role==='etablissement'?'ESTABLISHMENT':user?'AGENCY':'ALL'}/><hr/><div id="support">{user?<SupportTickets request={request} initialTicket={params.get('ticket')||''}/>:<section><h2>Besoin d’aide sans accès au compte ?</h2><p>Consultez le guide de connexion ou écrivez à <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a>. N’envoyez aucun mot de passe, document d’identité ou donnée bancaire par email.</p><p><Link to="/mot-de-passe-oublie">Récupérer mon accès</Link> · <Link to="/connexion">Me connecter pour suivre mes demandes</Link></p></section>}</div></main></EcranPublic>;}

import {Transform} from 'class-transformer';
import {Controller,Get,Query,UseGuards,ServiceUnavailableException} from '@nestjs/common';
import {IsString,Length} from 'class-validator';
import {SessionGuard} from '../common/access';
class LocationQuery {@Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @Length(3,150) q!:string;}
export async function findLocations(query:string,transport:typeof fetch=fetch){
 const url=new URL('https://data.geopf.fr/geocodage/search');url.searchParams.set('q',query.trim());url.searchParams.set('limit','5');
 try{
  const response=await transport(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Location provider unavailable');
  const data=await response.json(),items:{label:string;latitude:number;longitude:number}[]=[];
  if(!Array.isArray(data.features))throw Error('Invalid location response');
  for(const item of data.features.slice(0,5)){
   const label=item.properties?.label,coordinates=item.geometry?.coordinates;
   if(item.geometry?.type!=='Point'||typeof label!=='string'||!label.trim()||!Array.isArray(coordinates))continue;
   const [longitude,latitude]=coordinates;
   if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)continue;
   items.push({label:label.slice(0,200),latitude,longitude});
  }
  return {items,provider:'IGN'};
 }catch{throw new ServiceUnavailableException({code:'LOCATIONS_UNAVAILABLE',message:'La recherche de lieu est indisponible. Reessayez dans un instant.'});}
}
@Controller('listings/locations') @UseGuards(SessionGuard)
export class LocationsController {@Get() search(@Query() q:LocationQuery){return findLocations(q.q);}}

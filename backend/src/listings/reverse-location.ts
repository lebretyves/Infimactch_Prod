import { Body, Controller, HttpCode, Post, ServiceUnavailableException } from '@nestjs/common';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiServiceUnavailableResponse } from '@nestjs/swagger';

export class ReverseLocationDto {
  @ApiProperty({ type: Number, minimum: -90, maximum: 90, example: 48.8566, description: 'Latitude GPS en degrés décimaux.' })
  @IsNumber() @IsLatitude() latitude!: number;
  @ApiProperty({ type: Number, minimum: -180, maximum: 180, example: 2.3522, description: 'Longitude GPS en degrés décimaux.' })
  @IsNumber() @IsLongitude() longitude!: number;
}

/** Anonymous registration lookup; existing locations rate limit and CSRF apply.
 * Coordinates travel in the body, not in browser URLs or access-log query strings.
 * No profile is read or modified and the provider URL is fixed.
 */
export async function reverseLocation(latitude: number, longitude: number, transport: typeof fetch = fetch) {
  const url = new URL('https://data.geopf.fr/geocodage/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('index', 'address');
  url.searchParams.set('limit', '1');
  try {
    const response = await transport(url, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('Provider unavailable');
    const data = await response.json();
    if (!Array.isArray(data?.features)) throw Error('Invalid response');
    const feature = data.features[0], p = feature?.properties;
    const clean = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 200) : '';
    const city = clean(p?.city), postalCode = clean(p?.postcode);
    // A commune name is not a street address. Never fabricate a house number.
    const address = ['housenumber', 'street', 'locality'].includes(p?.type) ? clean(p?.name) : '';
    if (!city || !/^[0-9]{5}$/.test(postalCode) || (typeof p?.distance === 'number' && p.distance > 1000))
      return { address: null, provider: 'IGN' };
    return { address: { address, postalCode, city }, provider: 'IGN' };
  } catch {
    throw new ServiceUnavailableException({ code: 'LOCATIONS_UNAVAILABLE', message: 'La recherche d’adresse est indisponible. Saisissez votre adresse manuellement.' });
  }
}

@Controller('listings/locations')
export class ReverseLocationController {
  @Post('reverse') @HttpCode(200)
  @ApiOperation({ summary: 'Retrouver une adresse depuis des coordonnées GPS', description: 'Recherche IGN accessible pendant l’inscription. Ne modifie aucun profil. Sans adresse exploitable, address vaut null et la saisie manuelle reste possible. Les protections CSRF et de fréquence existantes s’appliquent.' })
  @ApiOkResponse({ description: 'Adresse trouvée ou absence de résultat exploitable.', schema: {
    type: 'object', required: ['address', 'provider'], properties: {
      provider: { type: 'string', enum: ['IGN'], example: 'IGN' },
      address: { type: 'object', nullable: true, required: ['address', 'postalCode', 'city'], properties: {
        address: { type: 'string', maxLength: 200, example: '8 Place de la Mairie', description: 'Voie uniquement ; chaîne vide si seule la commune est connue.' },
        postalCode: { type: 'string', pattern: '^[0-9]{5}$', example: '75004' },
        city: { type: 'string', maxLength: 200, example: 'Paris' },
      } },
    },
  } })
  @ApiBadRequestResponse({ description: 'Coordonnées obligatoires, numériques et dans les limites ; champs supplémentaires refusés.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } })
  @ApiServiceUnavailableResponse({ description: 'IGN indisponible ou réponse inexploitable ; proposer la saisie manuelle.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { code: 'LOCATIONS_UNAVAILABLE', message: 'La recherche d’adresse est indisponible. Saisissez votre adresse manuellement.' } } } })
  reverse(@Body() body: ReverseLocationDto) {
    return reverseLocation(body.latitude, body.longitude);
  }
}

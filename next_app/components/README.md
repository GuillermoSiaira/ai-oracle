LillyPanel: component that displays interpretation JSON. Use in pages to show results from Lilly Engine.

ChartWheel: SVG-based natal chart wheel (MVP). Accepts Abu chart JSON `{ planets[], aspects?, houses? }` and renders a responsive wheel with optional aspects and houses. Example:

```
import dynamic from 'next/dynamic'
const ChartWheel = dynamic(() => import('./ChartWheel'), { ssr: false })

<ChartWheel chart={chartJsonFromAbu} />
```

CitySelector: Autocomplete selector for cities with geographic coordinates. Fetches from Abu's `/api/cities/search` endpoint. Returns `{ city, country, lat, lon }`. Supports localStorage persistence. Example:

```tsx
import CitySelector, { CityData } from './CitySelector'

const [city, setCity] = useState<CityData | null>(null)

<CitySelector
  label="Lugar de nacimiento"
  value={city}
  onChange={setCity}
  placeholder="Buscar ciudad..."
  required
/>
```

import { notFound } from "next/navigation";
import {
  isDemoLang,
  isDemoSlug,
  type DemoLang,
  type DemoSlug,
} from "@/demos/config";
import { CompanySite } from "@/demos/company/Site";
import { LawyerSite } from "@/demos/lawyer/Site";
import { PhotographerSite } from "@/demos/photographer/Site";
import { RestaurantSite } from "@/demos/restaurant/Site";
import { ClinicSite } from "@/demos/clinic/Site";
import { ClinicSite as NawaClinicSite } from "@/demos/clinic-nawa/Site";
import { RealEstateSite } from "@/demos/realestate/Site";
import { RealEstateSite as SuknRealEstateSite } from "@/demos/realestate-sukn/Site";
import { GymSite } from "@/demos/gym/Site";
import { AppliancesSite } from "@/demos/appliances/Site";
import { PhonesSite } from "@/demos/phones/Site";

import { AcademySite } from "@/demos/academy/Site";
import { HotelSite } from "@/demos/hotel/Site";
import { ArchitectureSite } from "@/demos/architecture/Site";

const SITES: Record<DemoSlug, (props: { lang: DemoLang }) => React.ReactNode> =
  {
    company: CompanySite,
    lawyer: LawyerSite,
    photographer: PhotographerSite,
    restaurant: RestaurantSite,
    clinic: ClinicSite,
    realestate: RealEstateSite,
    "clinic-nawa": NawaClinicSite,
    "realestate-sukn": SuknRealEstateSite,
    gym: GymSite,
    appliances: AppliancesSite,
    phones: PhonesSite,
    academy: AcademySite,
    hotel: HotelSite,
    architecture: ArchitectureSite,
  };

export default async function DemoPage({
  params,
}: {
  params: Promise<{ site: string; lang: string }>;
}) {
  const { site, lang } = await params;
  if (!isDemoSlug(site) || !isDemoLang(lang)) notFound();
  const Site = SITES[site];
  return <Site lang={lang} />;
}

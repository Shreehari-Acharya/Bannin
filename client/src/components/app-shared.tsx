import { BookOpenIcon, HelpCircleIcon, LayoutGridIcon, MoveLeftIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	url: string;
	icon: React.ReactNode;
	isActive?: boolean;
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Bannin",
		items: [
			{
				title: "Incident Feed",
				url: "/events/all",
				icon: (
					<LayoutGridIcon
					/>
				),
				isActive: true,
			},
			{
				title: "Home",
				url: "/",
				icon: (
					<BookOpenIcon
					/>
				),
			},
			{
				title: "About",
				url: "/about",
				icon: (
					<HelpCircleIcon
					/>
				),
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Back to Landing",
		url: "/",
		icon: (
			<MoveLeftIcon data-icon="inline-start" />
		),
	}
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) => group.items),
	...footerNavLinks,
];

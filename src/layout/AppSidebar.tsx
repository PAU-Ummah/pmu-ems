'use client';
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../context/SidebarContext';
import { useRole } from '@/hooks/useRole';
import {
  Event,
  People,
  Assessment,
  AttachMoney,
  PersonAdd,
  Menu,
  ExpandMore,
  Description,
} from '@mui/icons-material';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const {
    canCreateEvents,
    canManagePeople,
    canManageFinance,
    canViewReports,
    canManageUsers,
    canMarkAttendance,
  } = useRole();

  const getAllNavItems = (): NavItem[] => [
    {
      icon: <Event sx={{ fontSize: 20 }} />,
      name: 'Events',
      path: '/events',
      subItems: undefined,
    },
    {
      icon: <People sx={{ fontSize: 20 }} />,
      name: 'Attendance',
      path: '/attendance',
      subItems: undefined,
    },
    {
      icon: <People sx={{ fontSize: 20 }} />,
      name: 'People',
      path: '/people',
      subItems: undefined,
    },
    {
      icon: <PersonAdd sx={{ fontSize: 20 }} />,
      name: 'User Management',
      path: '/user-management',
      subItems: undefined,
    },
    {
      icon: <AttachMoney sx={{ fontSize: 20 }} />,
      name: 'Finance',
      path: '/finance',
      subItems: undefined,
    },
    {
      icon: <Description sx={{ fontSize: 20 }} />,
      name: 'Finance-Report',
      path: '/finance-report',
      subItems: undefined,
    },
    {
      icon: <Assessment sx={{ fontSize: 20 }} />,
      name: 'Reports',
      path: '/reports',
      subItems: undefined,
    },
  ];

  const navItems = useMemo(() => {
    const allItems = getAllNavItems();
    return allItems.filter(item => {
      if (item.path === '/events' && !canCreateEvents()) return false;
      if (item.path === '/attendance' && !canMarkAttendance()) return false;
      if (item.path === '/people' && !canManagePeople()) return false;
      if (item.path === '/user-management' && !canManageUsers()) return false;
      if (item.path === '/finance' && !canManageFinance()) return false;
      if (item.path === '/finance-report' && !canManageFinance() && !canViewReports()) return false;
      if (item.path === '/reports' && !canViewReports()) return false;
      return true;
    });
  }, [canCreateEvents, canMarkAttendance, canManagePeople, canManageUsers, canManageFinance, canViewReports]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: 'main';
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => {
      if (!path) return false;
      return pathname === path || pathname.startsWith(path + '/');
    },
    [pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach(subItem => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: 'main',
              index,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight(prevHeights => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: 'main') => {
    setOpenSubmenu(prevOpenSubmenu => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (navItems: NavItem[], menuType: 'main') => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? 'menu-item-active'
                  : 'menu-item-inactive'
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'lg:justify-start'
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'menu-item-icon-active'
                    : 'menu-item-icon-inactive'
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={'menu-item-text'}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ExpandMore
                  className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? 'text-brand-500 rotate-180'
                      : ''
                  }`}
                  sx={{ fontSize: 20 }}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? 'menu-item-active' : 'menu-item-inactive'
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? 'menu-item-icon-active'
                      : 'menu-item-icon-inactive'
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={'menu-item-text'}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={el => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : '0px',
              }}
            >
              <ul className="mt-2 ml-9 space-y-1">
                {nav.subItems.map(subItem => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? 'menu-dropdown-item-active'
                          : 'menu-dropdown-item-inactive'
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 ${
        isExpanded || isMobileOpen
          ? 'w-[290px]'
          : isHovered
            ? 'w-[290px]'
            : 'w-[90px]'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start'
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-1">
              <Image
                src="/Logo.png"
                alt="Logo"
                width={48}
                height={48}
                className="object-contain"
              />
              <h1 className="text-2xl font-medium text-gray-700">EMS</h1>
            </div>
          ) : (
            <Image
              src="/Logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'justify-start'
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  'Menu'
                ) : (
                  <Menu sx={{ fontSize: 20 }} />
                )}
              </h2>
              {renderMenuItems(navItems, 'main')}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;

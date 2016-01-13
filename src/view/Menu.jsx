import './Menu.scss';
import app from '../service/app';
import classNames from 'classnames';
import router from '../service/router';
import lang from '../service/lang';
import MenuSection from './Menu/MenuSection.jsx';
import MenuOptionGroup from './Menu/MenuOptionGroup.jsx';
import MenuOption from './Menu/MenuOption.jsx';
import Icon from './Icon.jsx';
import ImageIcon from './ImageIcon.jsx';
import { requestRedraw } from '../util/animation';
/* eslint-disable no-unused-vars */
import m from 'mithril';
/* eslint-enable no-unused-vars */

const Menu = {
    view(ctrl, { tabs, tab: currentTab, menu, button }) {
        const { menuOpen } = app;
        const options = [];
        options.push(
            <div class="menu-tabs">
                <MenuOptionGroup
                    options={ tabs.map((tab) => (
                        <MenuOption
                            info={ tab.title }
                            icon={
                                <Icon icon={ tab.icon } spin={ tab.spin } />
                            }
                            selected={ currentTab === tab.id }
                            href={ `/${ tab.id }` }
                        />
                    )) }
                    tabs="true"
                />
            </div>
        );
        if(menu) {
            options.push(
                <div>
                    { menu }
                </div>
            );
        }
        //language
        options.push(
            <MenuSection
                icon={
                    <Icon icon="globe" />
                }
                title="language"
            />
        );
        for(const id in lang.messages) {
            const selectLanguage = lang.change.bind(lang, id);
            options.push(
                <MenuOption
                    selected={ lang.current === id }
                    icon={
                        <ImageIcon src={ `images/lang/${ id }.png` } icon="flag" />
                    }
                    title={ lang.messages[ id ].lang }
                    onclick={ selectLanguage }
                />
            );
        }
        // links
        options.push(
            <MenuSection
                icon={
                    <Icon icon="share" />
                }
                title="links"
            />
        );
        options.push(
            <MenuOption
                icon={
                    <Icon icon="bomb" />
                }
                title="link-kabam"
                href="http://community.kabam.com/forums/forumdisplay.php?1239-Marvel-Contest-of-Champions"
            />
        );
        options.push(
            <MenuOption
                icon={
                    <Icon icon="reddit-alien" />
                }
                title="link-reddit"
                href="http://reddit.com/r/ContestOfChampions"
            />
        );
        options.push(
            <MenuOption
                icon={
                    <Icon icon="github" />
                }
                title="link-github"
                href="//github.com/hook/champions"
            />
        );
        // links
        options.push(
            <MenuSection
                icon={
                    <Icon icon="share-alt" />
                }
                title="share-to"
            />
        );
        const escapedUrl = encodeURIComponent('http://hook.github.io/champions');
        options.push(
            <MenuOptionGroup
                options={[
                (
                    <MenuOption
                        icon={
                            <Icon icon="google-plus" />
                        }
                       href={ `https://plus.google.com/share?url=${ escapedUrl }` }
                    />
                ),
                (
                    <MenuOption
                        icon={
                            <Icon icon="facebook" />
                        }
                       href={ `http://www.facebook.com/sharer/sharer.php?u=${ escapedUrl }` }
                    />
                ),
                (
                    <MenuOption
                        icon={
                            <Icon icon="twitter" />
                        }
                       href={ `https://twitter.com/share?url=${ escapedUrl }` }
                    />
                ),
                (
                    <MenuOption
                        icon={
                            <Icon icon="pinterest-p" />
                        }
                       href={ `http://pinterest.com/pin/create/link/?url=${ escapedUrl }` }
                    />
                ),
                (
                    <MenuOption
                        icon={
                            <Icon icon="linkedin-square" />
                        }
                       href={ `https://www.linkedin.com/cws/share?url=${ escapedUrl }` }
                    />
                ),
                ]}
            />
        );
        return (
            <div m="Menu" class={ classNames('menu', { 'menu--open': menuOpen }) }>
                <div class="menu-background" onclick={ () => {
                    app.menuOpen = !menuOpen;
                    requestRedraw(2);
                }}></div>
                <div class="menu-wrapper">
                    <div class="menu-options">
                        { options }
                    </div>
                    <div class="menu-button menu-button-main" onclick={ () => {
                        app.menuOpen = !menuOpen;
                        requestRedraw(2);
                    }}>
                        <div class="menu-button-bar" />
                        <div class="menu-button-bar" />
                        <div class="menu-button-bar" />
                    </div>
                </div>
                { button && (
                    <a
                        role="button"
                        class="menu-button menu-button-sub"
                        href={ `#${ button.href }` }
                        onclick={ (event) => {
                            event.preventDefault();
                            router.setRoute(button.href);
                            requestRedraw();
                        }}
                    >
                        <Icon icon={ button.icon } />
                    </a>
                ) }
            </div>
        );
    },
};

export default Menu;

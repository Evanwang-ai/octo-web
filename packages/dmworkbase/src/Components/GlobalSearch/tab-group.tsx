import React, { Component } from "react";
import { ReactNode } from "react";
import ItemGroup from "./item-group";
import WKApp from "../../App";
import "./tab-group.css"

interface TabGroupProps {
    keyword?: string;
    groups?: any[];
    onClick?: (item: any) => void;
}

export default class TabGroup extends Component<TabGroupProps> {

    // Sticky groups：父层 tab 切换中途会把 groups 置为 undefined，保留上次
    // 非空值继续渲染，避免 ItemGroup / <img> 节点被销毁-重建触发头像请求重发。
    private stickyGroups?: any[]

    render(): ReactNode {
        const incoming = this.props.groups
        if (incoming !== undefined) {
            this.stickyGroups = incoming
        }
        const groups = this.stickyGroups
        return <div className="wk-tab-group">
            {
                groups?.map((item: any) => {
                    // 用 local displayName 替代对 item.channel_name 的 mutation。
                    // 直接改源数据会在 sticky + re-render 下反复 wrap 成
                    // <mark><mark>...</mark></mark>。与 tab-contacts.tsx 保持一致。
                    let displayName: string = item.channel_name
                    if (this.props.keyword && item.channel_name.indexOf(this.props.keyword) !== -1) {
                        displayName = item.channel_name.replace(
                            this.props.keyword,
                            `<mark>${this.props.keyword}</mark>`
                        )
                    }
                    return <ItemGroup
                    key={item.channel_id}
                    name={displayName}
                    avatar={WKApp.shared.avatarGroup(item.channel_id)}
                    onClick={()=>{
                        if(this.props.onClick) {
                            this.props.onClick(item)
                        }
                    }}
                    />
                })
            }
        </div>
    }
}
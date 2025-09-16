# Created by Claude Sonnet 3.5 from the prompt, "Add an entry to the AUTHORS
# dictionary for every member of the NASA-IMPACT Github organization."

from github import Auth, Github


def get_organization_members():
    g = Github(auth=Auth.NetrcAuth())
    org = g.get_organization("NASA-IMPACT")
    members = {}
    for member in org.get_members():
        user = g.get_user(member.login)
        name = user.name if user.name else member.login
        members[member.login] = name
    return members


if __name__ == "__main__":
    members = get_organization_members()
    print("AUTHORS = {")
    for login, name in sorted(members.items()):
        print(f'    "{login}": "{name}",')
    print("}")

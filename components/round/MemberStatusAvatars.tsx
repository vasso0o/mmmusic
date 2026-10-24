import Image from "next/image"

type LeagueMember = {
  id: string
  name: string
  image: string | null
}

function MemberAvatar({
  member,
  status,
}: {
  member: LeagueMember
  status: string
}) {
  const initial = member.name.trim().charAt(0).toUpperCase() || "?"

  return (
    <li>
      <span
        title={member.name}
        aria-label={`${member.name} — ${status}`}
        role="img"
        tabIndex={0}
        data-tooltip={member.name}
        className="group/avatar relative flex size-9 cursor-help items-center justify-center overflow-visible rounded-full border-2 border-background bg-secondary text-xs font-semibold text-secondary-foreground before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:z-50 before:mb-2 before:hidden before:-translate-x-1/2 before:whitespace-nowrap before:rounded-md before:bg-foreground before:px-2 before:py-1 before:text-xs before:font-medium before:text-background before:content-[attr(data-tooltip)] before:group-hover/avatar:block before:group-focus-visible/avatar:block after:pointer-events-none after:absolute after:bottom-full after:left-1/2 after:z-50 after:mb-1 after:hidden after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-foreground after:content-[''] after:group-hover/avatar:block after:group-focus-visible/avatar:block"
      >
        {member.image ? (
          <Image
            src={member.image}
            alt=""
            fill
            sizes="36px"
            unoptimized
            className="rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
    </li>
  )
}

export function MemberStatusAvatars({
  members,
  completedUserIds,
  completedLabel,
  pendingLabel,
}: {
  members: LeagueMember[]
  completedUserIds: string[]
  completedLabel: string
  pendingLabel: string
}) {
  const completedIds = new Set(completedUserIds)
  const completed = members.filter((member) => completedIds.has(member.id))
  const pending = members.filter((member) => !completedIds.has(member.id))
  const completedLabelLower = completedLabel.toLowerCase()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label={`Members who ${completedLabelLower}`}>
        <h4 className="text-sm font-semibold">
          {completedLabel}{" "}
          <span className="text-muted-foreground">({completed.length})</span>
        </h4>
        {completed.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1">
            {completed.map((member) => (
              <MemberAvatar
                key={member.id}
                member={member}
                status={completedLabelLower}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No one has {completedLabelLower} yet.
          </p>
        )}
      </section>

      <section aria-label={`Members who are ${pendingLabel.toLowerCase()}`}>
        <h4 className="text-sm font-semibold">
          {pendingLabel}{" "}
          <span className="text-muted-foreground">({pending.length})</span>
        </h4>
        {pending.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1">
            {pending.map((member) => (
              <MemberAvatar
                key={member.id}
                member={member}
                status={pendingLabel.toLowerCase()}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Everyone has {completedLabelLower}.
          </p>
        )}
      </section>
    </div>
  )
}

using UnityEngine;

public class SpawnObjectScript : MonoBehaviour
{
    [SerializeField] float spawnSpeed = 10.0f;
    [SerializeField] float speedMultiplier = 0.05f;
    public int spawnType;
    private Rigidbody2D rigidbody2D;

    private float timer = 0.0f;
    // Start is called before the first frame update
    void Start()
    {
        rigidbody2D = GetComponent<Rigidbody2D>();
    }

    // Update is called once per frame
    void Update()
    {
        MoveObjectsToLeft();
        DestroySpawns();
    }

    private void MoveObjectsToLeft()
    {
        rigidbody2D.velocity = Vector2.left * (spawnSpeed + speedMultiplier);
    }

    // A save guard if player miss the spawned object, it will be destroyed after 5 seconds
    private void DestroySpawns()
    {
        timer += Time.deltaTime;
    
        if (timer > 5)
            Destroy(gameObject);
    }
}
